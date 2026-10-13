import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../src/db/schema.ts'
import { getSession, signIn } from '../src/server/auth.server.ts'
import { activatePendingAccount, listPendingAccounts, signUp } from '../src/server/accounts.ts'
import { listUsers, setUserActive } from '../src/server/user-access.ts'

const connectionString = process.env.DATABASE_URL_TEST
if (!connectionString) {
	throw new Error('Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.')
}

const pool = new Pool({ connectionString })
const database = drizzle(pool, { schema })
const email = `signup-${randomUUID()}@integration.test`
const userIds: string[] = []

after(async () => {
	for (const userId of userIds) {
		await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId])
		await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId])
		await pool.query('DELETE FROM users WHERE id = $1', [userId])
	}
	await pool.end()
})

test('professor signup remains pending until an admin activates the account', async () => {
	const pending = await signUp(database, {
		email,
		name: 'Pending',
		surname: 'Professor',
		password: 'a supplied long professor secret',
	})
	userIds.push(pending.id)

	assert.equal(pending.email, email)
	assert.equal(pending.active, false)
	assert.deepEqual(pending.roles, ['professor'])
	assert.equal(await signIn(database, { email, password: 'a supplied long professor secret' }), null)
	const forgedToken = randomBytes(32).toString('base64url')
	await pool.query(
		'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
		[pending.id, createHash('sha256').update(forgedToken).digest('hex')],
	)
	assert.equal(await getSession(database, forgedToken), null)
	const listed = (await listPendingAccounts(database, { roles: ['admin'] })).find(({ id }) => id === pending.id)
	assert.ok(listed)
	assert.ok(listed.createdAt instanceof Date)
	await assert.rejects(listPendingAccounts(database, { roles: ['professor'] }), /admin/i)
	await assert.rejects(
		signUp(database, {
			email: email.toUpperCase(),
			name: 'Duplicate',
			surname: 'Professor',
			password: 'another supplied long secret',
		}),
		/already uses this email/i,
	)

	await assert.rejects(
		activatePendingAccount(database, pending.id, { roles: ['admin'] }, []),
		/at least one role/i,
	)
	const activated = await activatePendingAccount(database, pending.id, { roles: ['admin'] }, ['staff', 'professor'])
	assert.equal(activated.active, true)
	assert.deepEqual([...activated.roles].sort(), ['professor', 'staff'])
	assert.ok(!(await listPendingAccounts(database, { roles: ['admin'] })).some(({ id }) => id === pending.id))
	const session = await signIn(database, { email, password: 'a supplied long professor secret' })
	assert.ok(session)
	const signedIn = await getSession(database, session.token)
	assert.equal(signedIn?.id, pending.id)
	assert.deepEqual([...(signedIn?.roles ?? [])].sort(), ['professor', 'staff'])
})

test('an account stops being an access request once an admin accepts it', async () => {
	const admin = { roles: ['admin' as const] }
	const requested = await signUp(database, {
		email: `accepted-${randomUUID()}@integration.test`,
		name: 'Accepted',
		surname: 'Professor',
		password: 'a supplied long professor secret',
	})
	userIds.push(requested.id)
	const isRequest = async () => (await listPendingAccounts(database, admin)).some(({ id }) => id === requested.id)
	const managed = async () => (await listUsers(database, admin)).find(({ id }) => id === requested.id)

	assert.equal(await isRequest(), true)
	assert.equal(await managed(), undefined)
	await assert.rejects(setUserActive(database, requested.id, true, admin), /access request/i)

	await activatePendingAccount(database, requested.id, admin)
	assert.equal(await isRequest(), false)
	assert.equal((await managed())?.active, true)

	await setUserActive(database, requested.id, false, admin)
	assert.equal(await isRequest(), false)
	assert.equal((await managed())?.active, false)
	await assert.rejects(activatePendingAccount(database, requested.id, admin), /not found/i)
	assert.equal((await setUserActive(database, requested.id, true, admin)).active, true)
})
