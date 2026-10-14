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

/** The weekday of a YYYY-MM-DD date, Sunday as 0 like `weekdays`. */
export function weekdayOf(date: string): number {
	return toDate(date).getUTCDay();
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

/** A date the professor picked by hand, or null when the group cannot meet then. */
export function sessionDateOption({
	date,
	weekday,
	today,
	nowTime,
	startTime,
	minimumNoticeDays,
}: {
	date: string;
	weekday: number;
	today: string;
	nowTime: string;
	startTime: string;
	minimumNoticeDays: number;
}): SessionDateOption | null {
	if (toDate(date).getUTCDay() !== weekday || date < today) return null;
	if (date === today && nowTime >= startTime.slice(0, 5)) return null;
	return { date, late: daysBetween(today, date) < minimumNoticeDays };
}

export type SessionProgress = "past" | "ongoing" | "upcoming";

/**
 * Where a group's session stands this week, which runs Sunday through
 * Saturday. `today` is YYYY-MM-DD and `nowTime` is HH:MM, both in the SISLAB
 * time zone.
 */
export function groupSessionProgress({
	weekday,
	startTime,
	endTime,
	today,
	nowTime,
}: {
	weekday: number;
	startTime: string;
	endTime: string;
	today: string;
	nowTime: string;
}): SessionProgress {
	const todayWeekday = weekdayOf(today);
	if (weekday < todayWeekday) return "past";
	if (weekday > todayWeekday) return "upcoming";
	if (nowTime >= endTime.slice(0, 5)) return "past";
	return nowTime >= startTime.slice(0, 5) ? "ongoing" : "upcoming";
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
	/** "lunes" */
	weekday: { weekday: "long" },
	/** "12 oct" */
	dayMonthShort: { day: "numeric", month: "short" },
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

/** Lab sessions last two hours unless the professor says otherwise. */
const DEFAULT_SESSION_MINUTES = 120;

/**
 * The end time to suggest for a session that starts at `startTime` (HH:MM).
 * Null when the start is incomplete, the session would run past midnight, or
 * it would end after `latestEnd` (HH:MM, when given).
 */
export function defaultEndTime(
	startTime: string,
	latestEnd?: string,
): string | null {
	const start = toMinutes(startTime);
	if (start === null) return null;
	const endMinutes = start + DEFAULT_SESSION_MINUTES;
	if (endMinutes >= 24 * 60) return null;
	const latest = latestEnd === undefined ? null : toMinutes(latestEnd);
	if (latest !== null && endMinutes > latest) return null;
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}`;
}

function toMinutes(time: string): number | null {
	const match = /^(\d{2}):(\d{2})/.exec(time);
	return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function groupLabel(number: number): string {
	return `Grupo ${String(number).padStart(2, "0")}`;
}

function toDate(date: string): Date {
	return new Date(`${date}T12:00:00Z`);
}
