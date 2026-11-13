export const SISLAB_TIME_ZONE = 'America/Hermosillo'

/** `V` is the summer term ("Verano"), which falls between terms 1 and 2. */
export type AcademicPeriodCode = `${number}-${1 | 2 | 'V'}`

export function currentAcademicPeriodCode(
	instant: Date = new Date(),
): AcademicPeriodCode {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: SISLAB_TIME_ZONE,
		year: 'numeric',
		month: 'numeric',
	}).formatToParts(instant)
	const year = Number(parts.find((part) => part.type === 'year')?.value)
	const month = Number(parts.find((part) => part.type === 'month')?.value)
	if (!Number.isInteger(year) || !Number.isInteger(month)) {
		throw new Error('Could not determine the current academic period.')
	}
	return `${year}-${month <= 6 ? 1 : 2}`
}

export function regularPeriodCodes(year: number): AcademicPeriodCode[] {
	if (!Number.isInteger(year) || year < 2000 || year > 2200) {
		throw new Error('Enter a year between 2000 and 2200.')
	}
	return [`${year}-1`, `${year}-2`]
}

/** Trims and upper-cases a code, then checks it is YEAR-1, YEAR-2 or YEAR-V. */
export function validateAcademicPeriodCode(input: string): AcademicPeriodCode {
	const code = input.trim().toUpperCase()
	if (!/^\d{4}-[12V]$/.test(code)) {
		throw new Error('Period code must use YEAR-1, YEAR-2 or YEAR-V format.')
	}
	const year = Number(code.slice(0, 4))
	if (year < 2000 || year > 2200) {
		throw new Error('Period year must be between 2000 and 2200.')
	}
	return code as AcademicPeriodCode
}

/** Where each term falls within its year. Summer comes between the regular terms. */
const termOrder: Record<string, number> = { '1': 1, V: 2, '2': 3 }

/** Orders codes by year and then term. Codes with an unknown term go last in their year. */
export function compareAcademicPeriodCodes(a: string, b: string): number {
	const [yearA = '', termA = ''] = a.split('-')
	const [yearB = '', termB = ''] = b.split('-')
	return (
		yearA.localeCompare(yearB) ||
		(termOrder[termA] ?? 4) - (termOrder[termB] ?? 4) ||
		termA.localeCompare(termB)
	)
}

type DatedPeriod = { code: string; startsOn: string | null; endsOn: string | null }

function includesDate(period: DatedPeriod, date: string): boolean {
	return Boolean(
		period.startsOn && period.endsOn && period.startsOn <= date && date <= period.endsOn,
	)
}

/**
 * The period to offer by default. A period whose official dates include `today`
 * (YYYY-MM-DD) comes first, then the one named by `currentCode`. Null when neither exists.
 */
export function suggestedAcademicPeriodCode(
	periods: DatedPeriod[],
	today: string,
	currentCode: string,
): string | null {
	const suggested =
		periods.find((period) => includesDate(period, today)) ??
		periods.find(({ code }) => code === currentCode)
	return suggested?.code ?? null
}

export type AcademicPeriodStatus = 'current' | 'upcoming' | 'concluded'

/**
 * The official dates decide the status when the period has them. `today` is a
 * YYYY-MM-DD date. Without dates, the period's code is compared to `currentCode`.
 */
export function academicPeriodStatus(
	period: DatedPeriod,
	today: string,
	currentCode: string,
): AcademicPeriodStatus {
	if (period.startsOn && period.endsOn) {
		if (includesDate(period, today)) return 'current'
		return today < period.startsOn ? 'upcoming' : 'concluded'
	}
	const order = compareAcademicPeriodCodes(period.code, currentCode)
	if (order === 0) return 'current'
	return order > 0 ? 'upcoming' : 'concluded'
}

/**
 * The period a report opens on: the current one, or when none is current (a gap
 * between dated periods), the most recent one that has already started. Null
 * when no period has started.
 */
export function defaultReportPeriodCode(
	periods: DatedPeriod[],
	today: string,
	currentCode: string,
): string | null {
	const status = (period: DatedPeriod) =>
		academicPeriodStatus(period, today, currentCode)
	const current = periods.find((period) => status(period) === 'current')
	if (current) return current.code
	const started = periods
		.filter((period) => status(period) === 'concluded')
		.sort((a, b) => compareAcademicPeriodCodes(b.code, a.code))
	return started[0]?.code ?? null
}
