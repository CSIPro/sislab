import { type AnyColumn, asc, count, eq, inArray, type SQL, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../db/schema.ts'
import { groups, periods } from '../db/schema.ts'
import {
	currentAcademicPeriodCode,
	regularPeriodCodes,
	suggestedAcademicPeriodCode,
	validateAcademicPeriodCode,
} from '../lib/academic-period.ts'
import { sislabToday } from '../lib/session-dates.ts'

export type PeriodDatabase = NodePgDatabase<typeof schema>
export type AcademicPeriod = typeof periods.$inferSelect

/**
 * Orders a period-code column by year and then term, with summer (V) between terms 1 and 2.
 * It matches `compareAcademicPeriodCodes`; text order alone would put V after 2.
 */
export function byPeriodCode(code: AnyColumn): SQL[] {
	return [
		sql`split_part(${code}, '-', 1)`,
		sql`CASE split_part(${code}, '-', 2) WHEN '1' THEN 1 WHEN 'V' THEN 2 WHEN '2' THEN 3 ELSE 4 END`,
		asc(code),
	]
}

export async function listAcademicPeriods(
	database: PeriodDatabase,
	instant: Date = new Date(),
): Promise<{ periods: AcademicPeriod[]; suggestedCode: string | null }> {
	const available = await database
		.select()
		.from(periods)
		.orderBy(...byPeriodCode(periods.code))
	return {
		periods: available,
		suggestedCode: suggestedAcademicPeriodCode(
			available,
			sislabToday(instant),
			currentAcademicPeriodCode(instant),
		),
	}
}

export async function listAcademicPeriodsWithGroupCounts(
	database: PeriodDatabase,
): Promise<Array<AcademicPeriod & { groupCount: number }>> {
	return database
		.select({
			code: periods.code,
			startsOn: periods.startsOn,
			endsOn: periods.endsOn,
			groupCount: count(groups.id),
		})
		.from(periods)
		.leftJoin(groups, eq(groups.periodCode, periods.code))
		.groupBy(periods.code)
		.orderBy(...byPeriodCode(periods.code))
}

export async function saveAcademicPeriod(
	database: PeriodDatabase,
	input: { code: string; startsOn?: string | null; endsOn?: string | null },
): Promise<AcademicPeriod> {
	const code = validateAcademicPeriodCode(input.code)
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
