import assert from "node:assert/strict";
import { test } from "node:test";
import {
	academicPeriodStatus,
	compareAcademicPeriodCodes,
	suggestedAcademicPeriodCode,
	validateAcademicPeriodCode,
} from "./academic-period.ts";

const undated = { startsOn: null, endsOn: null };

test("a period without dates is current, upcoming or concluded relative to the current code", () => {
	const status = (code: string) =>
		academicPeriodStatus({ code, ...undated }, "2026-10-12", "2026-2");
	assert.equal(status("2026-2"), "current");
	assert.equal(status("2027-1"), "upcoming");
	assert.equal(status("2026-1"), "concluded");
	assert.equal(status("2025-2"), "concluded");
});

test("a period with dates is current only between its start and end dates", () => {
	const period = {
		code: "2026-2",
		startsOn: "2026-08-10",
		endsOn: "2026-12-04",
	};
	const status = (today: string) =>
		academicPeriodStatus(period, today, "2026-2");
	assert.equal(status("2026-08-09"), "upcoming");
	assert.equal(status("2026-08-10"), "current");
	assert.equal(status("2026-12-04"), "current");
	assert.equal(status("2026-12-05"), "concluded");
});

test("dates decide the status even when the code says otherwise", () => {
	const next = { code: "2027-1", startsOn: "2026-12-14", endsOn: "2027-05-28" };
	assert.equal(academicPeriodStatus(next, "2026-12-20", "2026-2"), "current");
});

test("a summer period without dates falls between the two regular terms", () => {
	const summer = { code: "2026-V", ...undated };
	assert.equal(
		academicPeriodStatus(summer, "2026-05-01", "2026-1"),
		"upcoming",
	);
	assert.equal(
		academicPeriodStatus(summer, "2026-10-12", "2026-2"),
		"concluded",
	);
});

test("period codes order by year, with summer between the regular terms", () => {
	const codes = ["2026-V", "2027-1", "2026-2", "2025-2", "2026-1"];
	assert.deepEqual(codes.sort(compareAcademicPeriodCodes), [
		"2025-2",
		"2026-1",
		"2026-V",
		"2026-2",
		"2027-1",
	]);
});

test("accepts regular and summer period codes", () => {
	assert.equal(validateAcademicPeriodCode("2026-1"), "2026-1");
	assert.equal(validateAcademicPeriodCode("2026-2"), "2026-2");
	assert.equal(validateAcademicPeriodCode("2026-V"), "2026-V");
	assert.equal(validateAcademicPeriodCode(" 2026-v "), "2026-V");
});

test("rejects period codes outside the YEAR-1, YEAR-2 and YEAR-V formats", () => {
	for (const code of [
		"2026-3",
		"2026-VV",
		"26-V",
		"2026V",
		"1999-V",
		"2201-1",
	]) {
		assert.throws(() => validateAcademicPeriodCode(code), /period/i);
	}
});

test("suggests the period whose dates include today, ahead of the half-year code", () => {
	const periods = [
		{ code: "2026-1", startsOn: null, endsOn: null },
		{ code: "2026-V", startsOn: "2026-06-08", endsOn: "2026-07-17" },
		{ code: "2026-2", startsOn: null, endsOn: null },
	];
	const suggested = (today: string, currentCode: string) =>
		suggestedAcademicPeriodCode(periods, today, currentCode);
	assert.equal(suggested("2026-06-07", "2026-1"), "2026-1");
	assert.equal(suggested("2026-06-08", "2026-1"), "2026-V");
	assert.equal(suggested("2026-07-10", "2026-2"), "2026-V");
	assert.equal(suggested("2026-07-18", "2026-2"), "2026-2");
});

test("suggests no period when none is current", () => {
	const periods = [{ code: "2026-1", startsOn: null, endsOn: null }];
	assert.equal(
		suggestedAcademicPeriodCode(periods, "2026-10-12", "2026-2"),
		null,
	);
	assert.equal(suggestedAcademicPeriodCode([], "2026-10-12", "2026-2"), null);
});
