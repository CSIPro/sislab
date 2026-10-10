import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../src/db/schema.ts'
import { getSession, signIn } from '../src/server/auth.server.ts'
import { activatePendingAccount, listPendingAccounts, signUp } from '../src/server/accounts.ts'

const connectionString = process.env.DATABASE_URL_TEST
if (!connectionString) {
	throw new Error('Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.')
}

const pool = new Pool({ connectionString })
const database = drizzle(pool, { schema })
const email = `signup-${randomUUID()}@integration.test`
let userId: string | undefined

after(async () => {
	if (userId) {
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
	userId = pending.id

	assert.equal(pending.email, email)
	assert.equal(pending.active, false)
	assert.deepEqual(pending.roles, ['professor'])
	assert.equal(await signIn(database, { email, password: 'a supplied long professor secret' }), null)
	const forgedToken = randomBytes(32).toString('base64url')
	await pool.query(
		'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
		[userId, createHash('sha256').update(forgedToken).digest('hex')],
	)
	assert.equal(await getSession(database, forgedToken), null)
	assert.ok((await listPendingAccounts(database, { roles: ['admin'] })).some(({ id }) => id === pending.id))
	await assert.rejects(listPendingAccounts(database, { roles: ['professor'] }), /admin/i)
	await assert.rejects(
		signUp(database, {
			email: email.toUpperCase(),
			name: 'Duplicate',
			surname: 'Professor',
			password: 'another supplied long secret',
		}),
		/already registered/i,
	)

	const activated = await activatePendingAccount(database, pending.id, { roles: ['admin'] })
	assert.equal(activated.active, true)
	assert.ok(!(await listPendingAccounts(database, { roles: ['admin'] })).some(({ id }) => id === pending.id))
	const session = await signIn(database, { email, password: 'a supplied long professor secret' })
	assert.ok(session)
	assert.equal((await getSession(database, session.token))?.id, pending.id)
})
