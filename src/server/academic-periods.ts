import { asc, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../db/schema.ts'
import { periods } from '../db/schema.ts'
import {
	currentAcademicPeriodCode,
	regularPeriodCodes,
	validateRegularPeriodCode,
} from '../lib/academic-period.ts'

export type PeriodDatabase = NodePgDatabase<typeof schema>
export type AcademicPeriod = typeof periods.$inferSelect

export async function listAcademicPeriods(
	database: PeriodDatabase,
	instant: Date = new Date(),
): Promise<{ periods: AcademicPeriod[]; suggestedCode: string | null }> {
	const available = await database.select().from(periods).orderBy(asc(periods.code))
	const currentCode = currentAcademicPeriodCode(instant)
	return {
		periods: available,
		suggestedCode: available.some(({ code }) => code === currentCode)
			? currentCode
			: null,
	}
}

export async function saveAcademicPeriod(
	database: PeriodDatabase,
	input: { code: string; startsOn?: string | null; endsOn?: string | null },
): Promise<AcademicPeriod> {
	const code = validateRegularPeriodCode(input.code.trim())
	const startsOn = normalizeDate(input.startsOn)
	const endsOn = normalizeDate(input.endsOn)
	if ((startsOn === null) !== (endsOn === null)) {
		throw new Error('Enter both period dates, or leave both blank.')
	}
	if (startsOn && endsOn && endsOn < startsOn) {
		throw new Error('The end date must be on or after the start date.')
	}
	const [saved] = await database
		.insert(periods)
		.values({ code, startsOn, endsOn })
		.onConflictDoUpdate({
			target: periods.code,
			set: { startsOn, endsOn },
		})
		.returning()
	if (!saved) throw new Error('Could not save the academic period.')
	return saved
}

export async function ensureRegularAcademicPeriods(
	database: PeriodDatabase,
	years: number[],
): Promise<AcademicPeriod[]> {
	if (years.length === 0) throw new Error('Choose at least one academic year.')
	const codes = [...new Set(years.flatMap((year) => regularPeriodCodes(year)))]
	await database
		.insert(periods)
		.values(codes.map((code) => ({ code, startsOn: null, endsOn: null })))
		.onConflictDoNothing({ target: periods.code })
	return database
		.select()
		.from(periods)
		.where(inArray(periods.code, codes))
		.orderBy(asc(periods.code))
}

function normalizeDate(value: string | null | undefined): string | null {
	if (value === null || value === undefined || value.trim() === '') return null
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new Error('Enter a valid date in YYYY-MM-DD format.')
	}
	const parsed = new Date(`${value}T00:00:00Z`)
	if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
		throw new Error('Enter a valid date in YYYY-MM-DD format.')
	}
	return value
}
