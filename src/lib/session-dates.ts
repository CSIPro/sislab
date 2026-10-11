import { SISLAB_TIME_ZONE } from "./academic-period.ts";

export type SessionDateOption = { date: string; late: boolean };

/** Today's calendar date in the SISLAB time zone, as YYYY-MM-DD. */
export function sislabToday(instant: Date = new Date()): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: SISLAB_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(instant);
}

/** The current wall-clock time in the SISLAB time zone, as HH:MM. */
export function sislabNowTime(instant: Date = new Date()): string {
	return new Intl.DateTimeFormat("en-US", {
		timeZone: SISLAB_TIME_ZONE,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(instant);
}

export function addDays(date: string, days: number): string {
	const value = toDate(date);
	value.setUTCDate(value.getUTCDate() + days);
	return value.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
	return Math.round(
		(toDate(to).getTime() - toDate(from).getTime()) / 86_400_000,
	);
}

export function weekRange(date: string): { from: string; through: string } {
	const from = addDays(date, -((toDate(date).getUTCDay() + 6) % 7));
	return { from, through: addDays(from, 6) };
}

export function upcomingSessionDates({
	weekday,
	today,
	nowTime,
	startTime,
	minimumNoticeDays,
	count,
}: {
	weekday: number;
	today: string;
	nowTime: string;
	startTime: string;
	minimumNoticeDays: number;
	count: number;
}): SessionDateOption[] {
	const daysUntilWeekday = (weekday - toDate(today).getUTCDay() + 7) % 7;
	const todayIsOpen = nowTime < startTime.slice(0, 5);
	const first = addDays(
		today,
		daysUntilWeekday === 0 && !todayIsOpen ? 7 : daysUntilWeekday,
	);
	return Array.from({ length: count }, (_, index) => {
		const date = addDays(first, index * 7);
		return { date, late: daysBetween(today, date) < minimumNoticeDays };
	});
}

const dateFormats = {
	/** "lun 12 oct" */
	short: { weekday: "short", day: "numeric", month: "short" },
	/** "miércoles 21 de octubre" */
	long: { weekday: "long", day: "numeric", month: "long" },
	/** "domingo 11 de octubre de 2026" */
	full: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
	/** "12 de octubre" */
	dayMonth: { day: "numeric", month: "long" },
	/** "lunes 12" */
	weekdayDay: { weekday: "long", day: "numeric" },
	weekdayShort: { weekday: "short" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export function formatSessionDate(
	date: string,
	style: keyof typeof dateFormats,
): string {
	const text = new Intl.DateTimeFormat("es-MX", {
		timeZone: "UTC",
		...dateFormats[style],
	})
		.format(toDate(date))
		.replaceAll(".", "")
		.replace(",", "");
	const compact = style === "short" ? text.replace(" de ", " ") : text;
	return compact.charAt(0).toLocaleUpperCase("es-MX") + compact.slice(1);
}

/** "12 al 18 de octubre", or "28 de octubre al 3 de noviembre" across months. */
export function formatDateSpan(from: string, through: string): string {
	const end = formatSessionDate(through, "dayMonth");
	return from.slice(0, 7) === through.slice(0, 7)
		? `${Number(from.slice(8))} al ${end}`
		: `${formatSessionDate(from, "dayMonth")} al ${end}`;
}

export function timeRange(startTime: string, endTime: string): string {
	return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}

export function groupLabel(number: number): string {
	return `Grupo ${String(number).padStart(2, "0")}`;
}

function toDate(date: string): Date {
	return new Date(`${date}T12:00:00Z`);
}
