import { createServerFn } from '@tanstack/react-start'
import { db } from '../db/index.ts'
import {
	addCatalogEntry,
	importCatalogValues,
	listActiveCatalogEntries,
	listCatalogEntries,
	renameCatalogEntry,
	retireCatalogEntry,
	type CatalogValues,
	type CatalogKind,
} from './catalogs.ts'
import { requireRole, requireUser } from './auth.server.ts'

export const listActiveCatalogEntriesFn = createServerFn({ method: 'GET' })
	.inputValidator(parseKind)
	.handler(async ({ data }) => {
		await requireUser()
		return listActiveCatalogEntries(db, data.kind)
	})

export const listCatalogEntriesFn = createServerFn({ method: 'GET' })
	.inputValidator(parseKind)
	.handler(async ({ data }) => {
		const actor = await requireAdmin()
		return listCatalogEntries(db, data.kind, actor)
	})

export const importCatalogValuesFn = createServerFn({ method: 'POST' })
	.inputValidator(parseValues)
	.handler(async ({ data }) => importCatalogValues(db, await requireAdmin(), data))

export const addCatalogEntryFn = createServerFn({ method: 'POST' })
	.inputValidator(parseEntry)
	.handler(async ({ data }) =>
		addCatalogEntry(db, data.kind, data.name, await requireAdmin()),
	)

export const renameCatalogEntryFn = createServerFn({ method: 'POST' })
	.inputValidator(parseEntryId)
	.handler(async ({ data }) =>
		renameCatalogEntry(db, data.kind, data.id, data.name, await requireAdmin()),
	)

export const retireCatalogEntryFn = createServerFn({ method: 'POST' })
	.inputValidator(parseKindId)
	.handler(async ({ data }) =>
		retireCatalogEntry(db, data.kind, data.id, await requireAdmin()),
	)

async function requireAdmin() {
	return requireRole('admin')
}

function parseKind(input: unknown): { kind: CatalogKind } {
	const kind = record(input).kind
	if (kind !== 'labs' && kind !== 'careers' && kind !== 'subjects') {
		throw new Error('Choose a valid catalog.')
	}
	return { kind }
}

function parseEntry(input: unknown): { kind: CatalogKind; name: string } {
	const data = record(input)
	const { kind } = parseKind(data)
	if (typeof data.name !== 'string') throw new Error('Enter a catalog name.')
	return { kind, name: data.name }
}

function parseEntryId(input: unknown): { kind: CatalogKind; id: string; name: string } {
	const data = record(input)
	const { kind } = parseKind(data)
	if (typeof data.id !== 'string' || typeof data.name !== 'string') {
		throw new Error('Catalog entry details are required.')
	}
	return { kind, id: data.id, name: data.name }
}

function parseKindId(input: unknown): { kind: CatalogKind; id: string } {
	const data = record(input)
	const { kind } = parseKind(data)
	if (typeof data.id !== 'string') throw new Error('Catalog entry is required.')
	return { kind, id: data.id }
}

function parseValues(input: unknown): CatalogValues {
	const data = record(input)
	const result: CatalogValues = {}
	for (const kind of ['labs', 'careers', 'subjects'] as const) {
		const value = data[kind] ?? []
		if (!Array.isArray(value) || !value.every((name) => typeof name === 'string')) {
			throw new Error(`Enter supplied ${kind} as a list of names.`)
		}
		result[kind] = value
	}
	return result
}

function record(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== 'object') throw new Error('Catalog details are required.')
	return input as Record<string, unknown>
}
