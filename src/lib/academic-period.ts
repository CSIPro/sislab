export const SISLAB_TIME_ZONE = 'America/Hermosillo'

export type AcademicPeriodCode = `${number}-${1 | 2}`

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

export function validateRegularPeriodCode(code: string): AcademicPeriodCode {
	if (!/^\d{4}-[12]$/.test(code)) {
		throw new Error('Period code must use YEAR-1 or YEAR-2 format.')
	}
	const year = Number(code.slice(0, 4))
	if (year < 2000 || year > 2200) {
		throw new Error('Period year must be between 2000 and 2200.')
	}
	return code as AcademicPeriodCode
}

export type AcademicPeriodStatus = 'current' | 'upcoming' | 'concluded'

/** Codes sort by year and then term, so comparing them as text orders the periods. */
export function academicPeriodStatus(
	code: string,
	currentCode: string,
): AcademicPeriodStatus {
	if (code === currentCode) return 'current'
	return code > currentCode ? 'upcoming' : 'concluded'
}
