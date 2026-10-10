import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.ts'

export type CatalogKind = 'labs' | 'careers' | 'subjects'
export type CatalogEntry = { id: string; name: string; active: boolean }
export type CatalogValues = Partial<Record<CatalogKind, string[]>>
export type CatalogActor = { roles: string[] }
export type CatalogDatabase = NodePgDatabase<typeof schema>

const catalogKinds: CatalogKind[] = ['labs', 'careers', 'subjects']

export async function listActiveCatalogEntries(
	database: CatalogDatabase,
	kind: CatalogKind,
): Promise<CatalogEntry[]> {
	return selectEntries(database, kind, true)
}

export async function listCatalogEntries(
	database: CatalogDatabase,
	kind: CatalogKind,
	actor: CatalogActor,
): Promise<CatalogEntry[]> {
	requireAdmin(actor)
	return selectEntries(database, kind, false)
}

export async function importCatalogValues(
	database: CatalogDatabase,
	actor: CatalogActor,
	values: CatalogValues,
): Promise<Record<CatalogKind, CatalogEntry[]>> {
	requireAdmin(actor)
	const result = {} as Record<CatalogKind, CatalogEntry[]>
	await database.transaction(async (transaction) => {
		for (const kind of catalogKinds) {
			const names = normalizeNames(values[kind] ?? [])
			for (const name of names) {
				await transaction.execute(sql`
					INSERT INTO ${sql.identifier(kind)} (name) VALUES (${name})
					ON CONFLICT (name) DO NOTHING
				`)
			}
		}
	})
	for (const kind of catalogKinds) {
		result[kind] = await selectEntries(database, kind, false)
	}
	return result
}

export async function addCatalogEntry(
	database: CatalogDatabase,
	kind: CatalogKind,
	name: string,
	actor: CatalogActor,
): Promise<CatalogEntry> {
	requireAdmin(actor)
	const normalized = normalizeName(name)
	await database.execute(sql`
		INSERT INTO ${sql.identifier(kind)} (name) VALUES (${normalized})
		ON CONFLICT (name) DO NOTHING
	`)
	const result = await database.execute(sql`
		SELECT id, name, active FROM ${sql.identifier(kind)} WHERE name = ${normalized}
	`)
	const entry = result.rows[0]
	if (!entry) throw new Error('Could not save this catalog entry.')
	return entry as CatalogEntry
}

export async function renameCatalogEntry(
	database: CatalogDatabase,
	kind: CatalogKind,
	id: string,
	name: string,
	actor: CatalogActor,
): Promise<CatalogEntry> {
	requireAdmin(actor)
	const normalized = normalizeName(name)
	const result = await database.execute(sql`
		UPDATE ${sql.identifier(kind)} SET name = ${normalized} WHERE id = ${id}::uuid
		RETURNING id, name, active
	`)
	const entry = result.rows[0]
	if (!entry) throw new Error('Catalog entry not found.')
	return entry as CatalogEntry
}

export async function retireCatalogEntry(
	database: CatalogDatabase,
	kind: CatalogKind,
	id: string,
	actor: CatalogActor,
): Promise<CatalogEntry> {
	requireAdmin(actor)
	const result = await database.execute(sql`
		UPDATE ${sql.identifier(kind)} SET active = false WHERE id = ${id}::uuid
		RETURNING id, name, active
	`)
	const entry = result.rows[0]
	if (!entry) throw new Error('Catalog entry not found.')
	return entry as CatalogEntry
}

function selectEntries(
	database: CatalogDatabase,
	kind: CatalogKind,
	activeOnly: boolean,
): Promise<CatalogEntry[]> {
	return database
		.execute(sql`
			SELECT id, name, active FROM ${sql.identifier(kind)}
			${activeOnly ? sql`WHERE active = true` : sql``}
			ORDER BY name
		`)
		.then((result) => result.rows as CatalogEntry[])
}

function requireAdmin(actor: CatalogActor): void {
	if (!actor.roles.includes('admin')) throw new Error('Admin access is required.')
}

function normalizeNames(values: string[]): string[] {
	return [...new Set(values.map(normalizeName))]
}

function normalizeName(value: string): string {
	const name = value.trim()
	if (!name) throw new Error('Catalog names cannot be empty.')
	return name
}
