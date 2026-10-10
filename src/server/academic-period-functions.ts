import { createServerFn } from '@tanstack/react-start'
import { db } from '../db/index.ts'
import { ensureRegularAcademicPeriods, listAcademicPeriods, saveAcademicPeriod } from './academic-periods.ts'
import { requireUser } from './auth-functions.ts'

export const listAcademicPeriodsFn = createServerFn({ method: 'GET' }).handler(
	async () => {
		await requireUser()
		return listAcademicPeriods(db)
	},
)

export const saveAcademicPeriodFn = createServerFn({ method: 'POST' })
	.inputValidator(parsePeriodInput)
	.handler(async ({ data }) => {
		await requireAdmin()
		return saveAcademicPeriod(db, data)
	})

export const ensureRegularAcademicPeriodsFn = createServerFn({ method: 'POST' })
	.inputValidator(parseYearsInput)
	.handler(async ({ data }) => {
		await requireAdmin()
		return ensureRegularAcademicPeriods(db, data.years)
	})

async function requireAdmin() {
	const user = await requireUser()
	if (!user.roles.includes('admin')) throw new Error('Admin access is required.')
	return user
}

function parsePeriodInput(input: unknown): {
	code: string
	startsOn: string | null
	endsOn: string | null
} {
	if (!input || typeof input !== 'object') throw new Error('Period details are required.')
	const data = input as Record<string, unknown>
	if (typeof data.code !== 'string') throw new Error('Enter a period code.')
	return {
		code: data.code,
		startsOn: optionalString(data.startsOn),
		endsOn: optionalString(data.endsOn),
	}
}

function parseYearsInput(input: unknown): { years: number[] } {
	if (!input || typeof input !== 'object') throw new Error('Academic years are required.')
	const years = (input as Record<string, unknown>).years
	if (!Array.isArray(years) || !years.every((year) => typeof year === 'number')) {
		throw new Error('Enter one or more academic years.')
	}
	return { years }
}

function optionalString(value: unknown): string | null {
	if (value === null || value === undefined || value === '') return null
	if (typeof value !== 'string') throw new Error('Period dates must be text values.')
	return value
}
