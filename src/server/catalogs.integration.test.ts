import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../db/schema.ts'
import {
	addCatalogEntry,
	importCatalogValues,
	listActiveCatalogEntries,
	listCatalogEntries,
	renameCatalogEntry,
	retireCatalogEntry,
} from './catalogs.ts'

const connectionString = process.env.DATABASE_URL_TEST
if (!connectionString) {
	throw new Error('Set DATABASE_URL_TEST to a dedicated PostgreSQL test database.')
}
const pool = connectionString ? new Pool({ connectionString, max: 1 }) : undefined
const database = pool ? drizzle(pool, { schema }) : undefined
const schemaName = `catalog_test_${randomUUID().replaceAll('-', '')}`
let schemaCreated = false

after(async () => {
	if (!pool) return
	if (schemaCreated) await pool.query(`DROP SCHEMA "${schemaName}" CASCADE`)
	await pool.end()
})

test('admin catalog operations are repeatable and preserve historical labels', {
	skip: !pool || !database,
}, async () => {
	if (!pool || !database) return
	await pool.query(`CREATE SCHEMA "${schemaName}"`)
	schemaCreated = true
	await pool.query(`SET search_path TO "${schemaName}"`)
	await pool.query('CREATE TABLE labs (id uuid PRIMARY KEY DEFAULT public.gen_random_uuid(), name text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true)')
	await pool.query('CREATE TABLE careers (id uuid PRIMARY KEY DEFAULT public.gen_random_uuid(), name text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true)')
	await pool.query('CREATE TABLE subjects (id uuid PRIMARY KEY DEFAULT public.gen_random_uuid(), name text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true)')
	await pool.query('CREATE TABLE historical_group_labels (lab_name text NOT NULL)')

	const admin = { roles: ['admin'] }
	const imported = { labs: ['Lab Alpha', 'Lab Alpha'], careers: ['Biology'], subjects: ['Chemistry'] }
	await importCatalogValues(database, admin, imported)
	await importCatalogValues(database, admin, imported)
	const [lab] = await listCatalogEntries(database, 'labs', admin)
	assert.ok(lab)
	assert.equal((await listCatalogEntries(database, 'labs', admin)).length, 1)
	assert.equal((await listCatalogEntries(database, 'careers', admin))[0]?.name, 'Biology')
	assert.equal((await listCatalogEntries(database, 'subjects', admin))[0]?.name, 'Chemistry')

	await pool.query('INSERT INTO historical_group_labels (lab_name) VALUES ($1)', [lab.name])
	await renameCatalogEntry(database, 'labs', lab.id, 'Lab Renamed', admin)
	await retireCatalogEntry(database, 'labs', lab.id, admin)
	assert.deepEqual(await listActiveCatalogEntries(database, 'labs'), [])
	assert.equal((await listCatalogEntries(database, 'labs', admin))[0]?.active, false)
	const historical = await pool.query('SELECT lab_name FROM historical_group_labels')
	assert.equal(historical.rows[0]?.lab_name, 'Lab Alpha')

	await addCatalogEntry(database, 'labs', ' Lab Beta ', admin)
	await addCatalogEntry(database, 'labs', 'Lab Beta', admin)
	assert.equal((await listActiveCatalogEntries(database, 'labs')).length, 1)
	await assert.rejects(
		listCatalogEntries(database, 'labs', { roles: ['professor'] }),
		/Admin access is required/,
	)
})
