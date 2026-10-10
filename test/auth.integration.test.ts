import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../src/db/schema.ts'
import { bootstrapAdmin, getSession, signIn, signOut } from '../src/server/auth.server.ts'

const connectionString = process.env.DATABASE_URL_TEST
if (!connectionString) {
  throw new Error('Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.')
}

const pool = new Pool({ connectionString })
const database = drizzle(pool, { schema })
const testEmail = `auth-${randomUUID()}@integration.test`
let userId: string | undefined

after(async () => {
  if (userId) {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId])
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId])
    await pool.query('DELETE FROM users WHERE id = $1', [userId])
  }
  await pool.end()
})

test('bootstrap provisions the first admin and sign-in creates revocable, expiring sessions', async () => {
  const admin = await bootstrapAdmin(database, {
    email: testEmail,
    name: 'Integration',
    surname: 'Admin',
    password: 'a supplied long integration secret',
  })
  userId = admin.id

  assert.equal(admin.active, true)
  assert.ok(admin.passwordHash)
  assert.equal(admin.passwordHash.includes('supplied long integration secret'), false)

  const invalidCredentials = await signIn(database, {
    email: testEmail,
    password: 'incorrect secret',
  })
  assert.equal(invalidCredentials, null)

  const now = new Date('2026-10-09T12:00:00.000Z')
  const session = await signIn(database, {
    email: testEmail,
    password: 'a supplied long integration secret',
    now,
  })
  assert.ok(session)
  assert.equal((await getSession(database, session.token, { now }))?.id, admin.id)
  assert.equal(
    await getSession(database, session.token, {
      now: new Date(session.expiresAt.getTime() + 1),
    }),
    null,
  )

  await pool.query('UPDATE users SET active = false WHERE id = $1', [admin.id])
  assert.equal(await getSession(database, session.token, { now }), null)
  await pool.query('UPDATE users SET active = true WHERE id = $1', [admin.id])

  await signOut(database, session.token)
  assert.equal(await getSession(database, session.token, { now }), null)
})

test('bootstrap refuses to create another first admin', async () => {
  await assert.rejects(
    bootstrapAdmin(database, {
      email: `second-${randomUUID()}@integration.test`,
      name: 'Second',
      surname: 'Admin',
      password: 'another supplied secret',
    }),
    /already been provisioned/i,
  )
})
