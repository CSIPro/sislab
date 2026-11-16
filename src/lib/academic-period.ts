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
	// The default term calendar: January to May, June and July, August to December.
	return `${year}-${month <= 5 ? 1 : month <= 7 ? 'V' : 2}`
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

export type EffectivePeriodDates = {
	startsOn: string
	endsOn: string
	/** True when an admin set the dates, false when they come from the term's defaults. */
	official: boolean
}

/** The dates a term runs when no official dates are set, or null for an unknown term. */
function defaultTermDates(code: string): { startsOn: string; endsOn: string } | null {
	const match = /^(\d{4})-([12V])$/.exec(code)
	if (!match) return null
	const [, year, term] = match
	if (term === '1') return { startsOn: `${year}-01-01`, endsOn: `${year}-05-31` }
	if (term === 'V') return { startsOn: `${year}-06-01`, endsOn: `${year}-07-31` }
	return { startsOn: `${year}-08-01`, endsOn: `${year}-12-31` }
}

/**
 * The dates a period runs: its official dates when it has both, otherwise its
 * term's default dates. Null for a code with an unknown term and no official dates.
 */
export function effectivePeriodDates(period: DatedPeriod): EffectivePeriodDates | null {
	if (period.startsOn && period.endsOn) {
		return { startsOn: period.startsOn, endsOn: period.endsOn, official: true }
	}
	const defaults = defaultTermDates(period.code)
	return defaults && { ...defaults, official: false }
}

function includesDate(period: DatedPeriod, date: string): boolean {
	const dates = effectivePeriodDates(period)
	return Boolean(dates && dates.startsOn <= date && date <= dates.endsOn)
}

/**
 * The period to offer by default: the one whose effective dates include `today`
 * (YYYY-MM-DD). Null when none does.
 */
export function suggestedAcademicPeriodCode(
	periods: DatedPeriod[],
	today: string,
): string | null {
	return periods.find((period) => includesDate(period, today))?.code ?? null
}

export type AcademicPeriodStatus = 'current' | 'upcoming' | 'concluded'

/** The effective dates decide the status. `today` is a YYYY-MM-DD date. */
export function academicPeriodStatus(period: DatedPeriod, today: string): AcademicPeriodStatus {
	const dates = effectivePeriodDates(period)
	if (!dates) return 'upcoming'
	if (includesDate(period, today)) return 'current'
	return today < dates.startsOn ? 'upcoming' : 'concluded'
}

/**
 * The period a page opens on: the current one, or when none is current (a gap
 * between dated periods), the most recent one that has already started. Null
 * when no period has started.
 */
export function defaultPeriodCode(periods: DatedPeriod[], today: string): string | null {
	const status = (period: DatedPeriod) => academicPeriodStatus(period, today)
	const current = periods.find((period) => status(period) === 'current')
	if (current) return current.code
	const started = periods
		.filter((period) => status(period) === 'concluded')
		.sort((a, b) => compareAcademicPeriodCodes(b.code, a.code))
	return started[0]?.code ?? null
}

export type GroupPeriodOption = {
	code: string
	groupCount: number
	/** True when the period's dates include today. */
	current: boolean
}

/**
 * What the period select on Mis grupos offers. The options are the periods where
 * the professor has a group (`groupPeriodCodes` holds one code per group) plus the
 * default period, newest first. The default is `defaultPeriodCode`, or the newest
 * option when no period has started. `requested` is the period from the page
 * address, which `selectedCode` honors only when it is one of the options.
 */
export function groupPeriodChoice(
	periods: DatedPeriod[],
	groupPeriodCodes: string[],
	today: string,
	requested: string | undefined,
): {
	options: GroupPeriodOption[]
	defaultCode: string | null
	defaultIsCurrent: boolean
	selectedCode: string | null
} {
	const known = new Map(periods.map((period) => [period.code, period]))
	const ruleDefault = defaultPeriodCode(periods, today)
	const counts = new Map<string, number>()
	for (const code of groupPeriodCodes) {
		if (known.has(code)) counts.set(code, (counts.get(code) ?? 0) + 1)
	}
	if (ruleDefault && !counts.has(ruleDefault)) counts.set(ruleDefault, 0)
	const options = [...counts]
		.sort(([a], [b]) => compareAcademicPeriodCodes(b, a))
		.map(([code, groupCount]) => ({
			code,
			groupCount,
			current: academicPeriodStatus(known.get(code) as DatedPeriod, today) === 'current',
		}))
	const defaultOption = options.find(({ code }) => code === ruleDefault) ?? options[0]
	const selected = options.find(({ code }) => code === requested) ?? defaultOption
	return {
		options,
		defaultCode: defaultOption?.code ?? null,
		defaultIsCurrent: defaultOption?.current ?? false,
		selectedCode: selected?.code ?? null,
	}
}
