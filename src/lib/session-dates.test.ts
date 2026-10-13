import assert from "node:assert/strict";
import { test } from "node:test";
import {
	addDays,
	daysBetween,
	defaultEndTime,
	formatDateSpan,
	sessionDateOption,
	upcomingSessionDates,
	weekRange,
} from "./session-dates.ts";

test("offers the next sessions on the group's weekday and flags short notice", () => {
	// 2026-10-11 is a Sunday; weekday 3 is Wednesday.
	const dates = upcomingSessionDates({
		weekday: 3,
		today: "2026-10-11",
		nowTime: "10:00",
		startTime: "17:00:00",
		minimumNoticeDays: 7,
		count: 4,
	});
	assert.deepEqual(dates, [
		{ date: "2026-10-14", late: true },
		{ date: "2026-10-21", late: false },
		{ date: "2026-10-28", late: false },
		{ date: "2026-11-04", late: false },
	]);
});

test("offers today only before the session starts", () => {
	const options = {
		weekday: 0,
		today: "2026-10-11",
		startTime: "09:00:00",
		minimumNoticeDays: 0,
		count: 1,
	};
	assert.deepEqual(upcomingSessionDates({ ...options, nowTime: "08:59" }), [
		{ date: "2026-10-11", late: false },
	]);
	assert.deepEqual(upcomingSessionDates({ ...options, nowTime: "09:00" }), [
		{ date: "2026-10-18", late: false },
	]);
});

test("a week runs Monday through Sunday", () => {
	assert.deepEqual(weekRange("2026-10-14"), {
		from: "2026-10-12",
		through: "2026-10-18",
	});
	assert.deepEqual(weekRange("2026-10-18"), {
		from: "2026-10-12",
		through: "2026-10-18",
	});
});

test("date arithmetic crosses month boundaries", () => {
	assert.equal(addDays("2026-10-28", 7), "2026-11-04");
	assert.equal(daysBetween("2026-10-11", "2026-10-21"), 10);
});

test("a date span names the month once when both ends share it", () => {
	assert.equal(
		formatDateSpan("2026-10-12", "2026-10-18"),
		"12 al 18 de octubre",
	);
	assert.equal(
		formatDateSpan("2026-10-26", "2026-11-01"),
		"26 de octubre al 1 de noviembre",
	);
});

test("a hand-picked date must fall on the group's weekday and still be open", () => {
	// 2026-10-11 is a Sunday; weekday 3 is Wednesday.
	const options = {
		weekday: 3,
		today: "2026-10-11",
		nowTime: "10:00",
		startTime: "17:00:00",
		minimumNoticeDays: 7,
	};
	assert.deepEqual(sessionDateOption({ ...options, date: "2026-11-25" }), {
		date: "2026-11-25",
		late: false,
	});
	assert.deepEqual(sessionDateOption({ ...options, date: "2026-10-14" }), {
		date: "2026-10-14",
		late: true,
	});
	assert.equal(sessionDateOption({ ...options, date: "2026-11-26" }), null);
	assert.equal(sessionDateOption({ ...options, date: "2026-10-07" }), null);
	assert.equal(
		sessionDateOption({
			...options,
			today: "2026-10-14",
			nowTime: "17:00",
			date: "2026-10-14",
		}),
		null,
	);
});

test("a lab session ends two hours after it starts by default", () => {
	assert.equal(defaultEndTime("10:00"), "12:00");
	assert.equal(defaultEndTime("07:30"), "09:30");
	assert.equal(defaultEndTime("21:59"), "23:59");
});

test("offers no default end time when two hours would pass midnight", () => {
	assert.equal(defaultEndTime("22:00"), null);
	assert.equal(defaultEndTime("23:15"), null);
});

test("offers no default end time while the start time is incomplete", () => {
	assert.equal(defaultEndTime(""), null);
});
