import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../src/db/schema.ts'
import { getSession, hasRole, hashPassword, signIn } from '../src/server/auth.server.ts'
import { listPendingAccounts } from '../src/server/accounts.ts'
import {
	listUsers,
	replaceUserPassword,
	setUserActive,
	setUserRoles,
} from '../src/server/user-access.ts'

const connectionString = process.env.DATABASE_URL_TEST
if (!connectionString) {
	throw new Error('Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.')
}

const pool = new Pool({ connectionString })
const database = drizzle(pool, { schema })
const adminEmail = `access-admin-${randomUUID()}@integration.test`
const targetEmail = `access-target-${randomUUID()}@integration.test`
const otherAdminEmail = `access-other-admin-${randomUUID()}@integration.test`
const adminPassword = 'initial admin password secret'
const targetPassword = 'initial target password secret'
const actor = { roles: ['admin'] as Array<'admin' | 'staff' | 'professor'> }
let userIds: string[] = []

after(async () => {
	for (const userId of userIds) {
		await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId])
		await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId])
		await pool.query('DELETE FROM users WHERE id = $1', [userId])
	}
	await pool.end()
})

test('admins can manage roles and activity; password replacement revokes old credentials', async () => {
	assert.equal(hasRole(['admin'], 'staff'), true)
	assert.equal(hasRole(['admin', 'professor'], 'professor'), true)
	assert.equal(hasRole(['professor'], 'staff'), false)
	const adminHash = await hashPassword(adminPassword)
	const targetHash = await hashPassword(targetPassword)
	const otherHash = await hashPassword('another admin password secret')
	const inserted = await pool.query(
		`INSERT INTO users (email, password_hash, name, surname, active, verified_at)
		 VALUES ($1, $2, 'Access', 'Admin', true, NOW()), ($3, $4, 'Target', 'User', true, NOW()), ($5, $6, 'Other', 'Admin', true, NOW())
		 RETURNING id, email`,
		[adminEmail, adminHash, targetEmail, targetHash, otherAdminEmail, otherHash],
	)
	userIds = inserted.rows.map((row: { id: string }) => row.id)
	const adminId = inserted.rows.find((row: { email: string }) => row.email === adminEmail)?.id
	const targetId = inserted.rows.find((row: { email: string }) => row.email === targetEmail)?.id
	const otherAdminId = inserted.rows.find((row: { email: string }) => row.email === otherAdminEmail)?.id
	assert.ok(adminId && targetId && otherAdminId)
	await pool.query(
		`INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin'), ($2, 'professor'), ($3, 'admin')`,
		[adminId, targetId, otherAdminId],
	)

	const users = await listUsers(database, actor)
	assert.ok(users.some(({ id }) => id === targetId && id !== adminId))
	await assert.rejects(listUsers(database, { roles: ['staff'] }), /admin/i)
	await assert.rejects(setUserRoles(database, targetId, ['admin'], { roles: ['staff'] }), /admin/i)
	await assert.rejects(replaceUserPassword(database, targetId, 'non admin replacement', { roles: ['professor'] }), /admin/i)

	const assigned = await setUserRoles(database, targetId, ['staff', 'admin', 'professor'], actor)
	assert.deepEqual(new Set(assigned.roles), new Set(['staff', 'admin', 'professor']))
	const reduced = await setUserRoles(database, targetId, ['staff', 'professor'], actor)
	assert.deepEqual(new Set(reduced.roles), new Set(['staff', 'professor']))

	const oldSession = await signIn(database, { email: targetEmail, password: targetPassword })
	assert.ok(oldSession)
	assert.equal((await getSession(database, oldSession.token))?.id, targetId)

	await setUserActive(database, targetId, false, actor)
	assert.equal(await getSession(database, oldSession.token), null)
	assert.equal(await signIn(database, { email: targetEmail, password: targetPassword }), null)
	await setUserActive(database, targetId, true, actor)
	const newPassword = 'replacement password secret'
	await replaceUserPassword(database, targetId, newPassword, actor)
	assert.equal(await signIn(database, { email: targetEmail, password: targetPassword }), null)
	const replacementSession = await signIn(database, { email: targetEmail, password: newPassword })
	assert.ok(replacementSession)
	await replaceUserPassword(database, targetId, 'final replacement password secret', actor)
	assert.equal(await getSession(database, replacementSession.token), null)

	await setUserRoles(database, otherAdminId, [], actor)
	await assert.rejects(setUserRoles(database, adminId, ['staff'], actor), /last active admin/i)
	await assert.rejects(setUserActive(database, otherAdminId, false, { roles: ['professor'] }), /admin/i)
	await assert.rejects(setUserActive(database, adminId, false, actor), /last active admin/i)
})

test('deactivating an account from before verified_at existed does not turn it into an access request', async () => {
	const inserted = await pool.query(
		`INSERT INTO users (email, name, surname, active) VALUES ($1, 'Earlier', 'Professor', true) RETURNING id`,
		[`access-earlier-${randomUUID()}@integration.test`],
	)
	const earlierId = inserted.rows[0].id as string
	userIds.push(earlierId)
	await pool.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'professor')`, [earlierId])

	await setUserActive(database, earlierId, false, actor)
	assert.ok(!(await listPendingAccounts(database, actor)).some(({ id }) => id === earlierId))
	assert.equal((await listUsers(database, actor)).find(({ id }) => id === earlierId)?.active, false)
	assert.equal((await setUserActive(database, earlierId, true, actor)).active, true)
})
