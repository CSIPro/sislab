import {
	type PreparationRequestStatusFields,
	requestStatusKey,
} from "./preparation-request-status.ts";
import { addDays, weekRange } from "./session-dates.ts";

export type WeekDaySummary = {
	date: string;
	/** Requests that still stand: registered, or a late exception not yet declined. */
	count: number;
	/** Late exceptions waiting for a decision. They are part of `count`. */
	pending: number;
	/** Voided requests and declined exceptions. They are not part of `count`. */
	dropped: number;
};

/** The seven days of the week that holds `date`, Monday first. */
export function weekDaySummaries(
	date: string,
	requests: Array<PreparationRequestStatusFields & { sessionDate: string }>,
): WeekDaySummary[] {
	const { from } = weekRange(date);
	return Array.from({ length: 7 }, (_, index) => {
		const day = addDays(from, index);
		const summary = { date: day, count: 0, pending: 0, dropped: 0 };
		for (const request of requests) {
			if (request.sessionDate !== day) continue;
			const status = requestStatusKey(request);
			if (status === "voided" || status === "declined") summary.dropped += 1;
			else summary.count += 1;
			if (status === "pending") summary.pending += 1;
		}
		return summary;
	});
}
