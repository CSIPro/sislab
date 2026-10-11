import assert from "node:assert/strict";
import { test } from "node:test";
import { weekDaySummaries } from "./week-summary.ts";

const request = (
	sessionDate: string,
	fields: Partial<{
		status: string;
		lateReason: string | null;
		lateAcceptedAt: Date | null;
		lateDeclinedAt: Date | null;
	}> = {},
) => ({
	sessionDate,
	status: "open",
	lateReason: null,
	lateAcceptedAt: null,
	lateDeclinedAt: null,
	...fields,
});

test("lists the seven days of the week that holds the date", () => {
	// 2026-10-14 is a Wednesday.
	assert.deepEqual(
		weekDaySummaries("2026-10-14", []).map((day) => day.date),
		[
			"2026-10-12",
			"2026-10-13",
			"2026-10-14",
			"2026-10-15",
			"2026-10-16",
			"2026-10-17",
			"2026-10-18",
		],
	);
});

test("counts each day's requests that still stand, and flags the undecided and the dropped", () => {
	const late = { lateReason: "Cambio de horario" };
	const days = weekDaySummaries("2026-10-14", [
		request("2026-10-12"),
		request("2026-10-12", { ...late, lateAcceptedAt: new Date() }),
		request("2026-10-12", late),
		request("2026-10-13", { status: "voided" }),
		request("2026-10-13", { ...late, lateDeclinedAt: new Date() }),
		// Outside the week.
		request("2026-10-19"),
		request("2026-10-11"),
	]);
	assert.deepEqual(days.slice(0, 3), [
		{ date: "2026-10-12", count: 3, pending: 1, dropped: 0 },
		{ date: "2026-10-13", count: 0, pending: 0, dropped: 2 },
		{ date: "2026-10-14", count: 0, pending: 0, dropped: 0 },
	]);
});
