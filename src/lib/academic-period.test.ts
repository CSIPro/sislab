import assert from "node:assert/strict";
import { test } from "node:test";
import {
	academicPeriodStatus,
	compareAcademicPeriodCodes,
	currentAcademicPeriodCode,
	defaultPeriodCode,
	effectivePeriodDates,
	groupPeriodChoice,
	suggestedAcademicPeriodCode,
	validateAcademicPeriodCode,
} from "./academic-period.ts";

const undated = { startsOn: null, endsOn: null };

test("an undated period has its term's default dates", () => {
	const dates = (code: string) => effectivePeriodDates({ code, ...undated });
	assert.deepEqual(dates("2026-1"), {
		startsOn: "2026-01-01",
		endsOn: "2026-05-31",
		official: false,
	});
	assert.deepEqual(dates("2026-V"), {
		startsOn: "2026-06-01",
		endsOn: "2026-07-31",
		official: false,
	});
	assert.deepEqual(dates("2026-2"), {
		startsOn: "2026-08-01",
		endsOn: "2026-12-31",
		official: false,
	});
});

test("official dates override the term's default dates", () => {
	const period = {
		code: "2026-V",
		startsOn: "2026-06-08",
		endsOn: "2026-07-17",
	};
	assert.deepEqual(effectivePeriodDates(period), {
		startsOn: "2026-06-08",
		endsOn: "2026-07-17",
		official: true,
	});
});

test("a code outside the three terms has no default dates", () => {
	assert.equal(effectivePeriodDates({ code: "2026-x", ...undated }), null);
});

test("the current code follows the default term calendar in Hermosillo time", () => {
	const at = (instant: string) => currentAcademicPeriodCode(new Date(instant));
	// Hermosillo is UTC-7 all year, so midnight there is 07:00 UTC.
	assert.equal(at("2026-01-01T06:59:00Z"), "2025-2");
	assert.equal(at("2026-01-01T07:00:00Z"), "2026-1");
	assert.equal(at("2026-06-01T06:59:00Z"), "2026-1");
	assert.equal(at("2026-06-01T07:00:00Z"), "2026-V");
	assert.equal(at("2026-08-01T06:59:00Z"), "2026-V");
	assert.equal(at("2026-08-01T07:00:00Z"), "2026-2");
	assert.equal(at("2027-01-01T06:59:00Z"), "2026-2");
});

test("an undated period is current only during its term's default dates", () => {
	const status = (code: string, today: string) =>
		academicPeriodStatus({ code, ...undated }, today);
	assert.equal(status("2026-1", "2026-05-31"), "current");
	assert.equal(status("2026-1", "2026-06-01"), "concluded");
	assert.equal(status("2026-V", "2026-05-31"), "upcoming");
	assert.equal(status("2026-V", "2026-06-01"), "current");
	assert.equal(status("2026-V", "2026-07-31"), "current");
	assert.equal(status("2026-V", "2026-08-01"), "concluded");
	assert.equal(status("2026-2", "2026-07-31"), "upcoming");
	assert.equal(status("2026-2", "2026-08-01"), "current");
	assert.equal(status("2026-2", "2026-12-31"), "current");
	assert.equal(status("2027-1", "2026-12-31"), "upcoming");
	assert.equal(status("2027-1", "2027-01-01"), "current");
	assert.equal(status("2025-2", "2026-01-01"), "concluded");
});

test("a period with dates is current only between its start and end dates", () => {
	const period = {
		code: "2026-2",
		startsOn: "2026-08-10",
		endsOn: "2026-12-04",
	};
	const status = (today: string) => academicPeriodStatus(period, today);
	assert.equal(status("2026-08-09"), "upcoming");
	assert.equal(status("2026-08-10"), "current");
	assert.equal(status("2026-12-04"), "current");
	assert.equal(status("2026-12-05"), "concluded");
});

test("dates decide the status even when the code says otherwise", () => {
	const next = { code: "2027-1", startsOn: "2026-12-14", endsOn: "2027-05-28" };
	assert.equal(academicPeriodStatus(next, "2026-12-20"), "current");
});

test("a period with an unknown term and no dates is never current", () => {
	assert.equal(
		academicPeriodStatus({ code: "2026-x", ...undated }, "2026-10-12"),
		"upcoming",
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

test("suggests the period whose effective dates include today", () => {
	const periods = [
		{ code: "2026-1", startsOn: null, endsOn: null },
		{ code: "2026-V", startsOn: "2026-06-08", endsOn: "2026-07-17" },
		{ code: "2026-2", startsOn: null, endsOn: null },
	];
	const suggested = (today: string) =>
		suggestedAcademicPeriodCode(periods, today);
	assert.equal(suggested("2026-05-31"), "2026-1");
	// The summer period's official dates replace its default June 1 start.
	assert.equal(suggested("2026-06-01"), null);
	assert.equal(suggested("2026-06-08"), "2026-V");
	assert.equal(suggested("2026-07-17"), "2026-V");
	assert.equal(suggested("2026-07-18"), null);
	assert.equal(suggested("2026-08-01"), "2026-2");
});

test("an undated summer period is suggested in June and July", () => {
	const periods = ["2026-1", "2026-V", "2026-2"].map((code) => ({
		code,
		...undated,
	}));
	assert.equal(suggestedAcademicPeriodCode(periods, "2026-06-01"), "2026-V");
	assert.equal(suggestedAcademicPeriodCode(periods, "2026-07-31"), "2026-V");
});

test("suggests no period when none covers today", () => {
	const periods = [{ code: "2026-1", startsOn: null, endsOn: null }];
	assert.equal(suggestedAcademicPeriodCode(periods, "2026-10-12"), null);
	assert.equal(suggestedAcademicPeriodCode([], "2026-10-12"), null);
	// With no summer period saved, June has no suggestion.
	assert.equal(suggestedAcademicPeriodCode(periods, "2026-06-15"), null);
});

const dated = (code: string, startsOn: string, endsOn: string) => ({
	code,
	startsOn,
	endsOn,
});

test("the default period is the one whose dates include today", () => {
	const periods = [
		dated("2026-1", "2026-01-12", "2026-06-05"),
		dated("2026-V", "2026-06-08", "2026-07-17"),
		dated("2026-2", "2026-08-10", "2026-12-04"),
	];
	assert.equal(defaultPeriodCode(periods, "2026-03-02"), "2026-1");
	assert.equal(defaultPeriodCode(periods, "2026-07-10"), "2026-V");
	assert.equal(defaultPeriodCode(periods, "2026-12-04"), "2026-2");
});

test("on a gap day the default period is the latest one that has started", () => {
	const periods = [
		dated("2025-2", "2025-08-11", "2025-12-05"),
		dated("2026-1", "2026-01-12", "2026-06-05"),
		dated("2026-2", "2026-08-10", "2026-12-04"),
	];
	assert.equal(defaultPeriodCode(periods, "2026-07-30"), "2026-1");
	// After the last period ends, it is still the most recent one.
	assert.equal(defaultPeriodCode(periods, "2026-12-20"), "2026-2");
});

test("undated periods follow the default term calendar", () => {
	const periods = ["2025-2", "2026-1", "2026-2", "2027-1"].map((code) => ({
		code,
		...undated,
	}));
	assert.equal(defaultPeriodCode(periods, "2026-10-12"), "2026-2");
	// No period exists for June, so the latest earlier one is used.
	assert.equal(defaultPeriodCode(periods, "2026-06-15"), "2026-1");
	const gap = ["2025-2", "2026-2"].map((code) => ({ code, ...undated }));
	assert.equal(defaultPeriodCode(gap, "2026-03-02"), "2025-2");
});

test("there is no default period when none has started", () => {
	const upcoming = [{ code: "2027-1", ...undated }];
	assert.equal(defaultPeriodCode(upcoming, "2026-10-12"), null);
	assert.equal(defaultPeriodCode([], "2026-10-12"), null);
});

const periodsOf = (...codes: string[]) =>
	codes.map((code) => ({ code, ...undated }));

test("the select lists the periods with groups plus the default, newest first, with counts", () => {
	const periods = periodsOf("2025-2", "2026-1", "2026-V", "2026-2", "2027-1");
	const choice = groupPeriodChoice(
		periods,
		["2025-2", "2026-1", "2026-1", "2026-1"],
		"2026-10-12",
		undefined,
	);
	assert.deepEqual(choice.options, [
		{ code: "2026-2", groupCount: 0, current: true },
		{ code: "2026-1", groupCount: 3, current: false },
		{ code: "2025-2", groupCount: 1, current: false },
	]);
	assert.equal(choice.defaultCode, "2026-2");
	assert.equal(choice.defaultIsCurrent, true);
	assert.equal(choice.selectedCode, "2026-2");
});

test("the default period is listed once when the professor has groups in it", () => {
	const periods = periodsOf("2026-1", "2026-2");
	const choice = groupPeriodChoice(
		periods,
		["2026-2", "2026-2"],
		"2026-10-12",
		undefined,
	);
	assert.deepEqual(choice.options, [
		{ code: "2026-2", groupCount: 2, current: true },
	]);
});

test("the requested period is selected when it is an option", () => {
	const periods = periodsOf("2025-2", "2026-1", "2026-2");
	const groupCodes = ["2025-2", "2026-2"];
	const select = (requested: string | undefined) =>
		groupPeriodChoice(periods, groupCodes, "2026-10-12", requested)
			.selectedCode;
	assert.equal(select("2025-2"), "2025-2");
	// Periods without groups, unknown periods and nothing at all fall back.
	assert.equal(select("2026-1"), "2026-2");
	assert.equal(select("2031-1"), "2026-2");
	assert.equal(select(undefined), "2026-2");
});

test("on a gap day the default is the latest period that started and is not current", () => {
	const periods = [
		dated("2026-1", "2026-01-12", "2026-06-05"),
		dated("2026-2", "2026-08-10", "2026-12-04"),
	];
	const choice = groupPeriodChoice(periods, [], "2026-07-30", undefined);
	assert.equal(choice.defaultCode, "2026-1");
	assert.equal(choice.defaultIsCurrent, false);
	assert.deepEqual(choice.options, [
		{ code: "2026-1", groupCount: 0, current: false },
	]);
});

test("with no period started, the select offers the periods that have groups", () => {
	const periods = periodsOf("2027-1", "2027-2");
	const choice = groupPeriodChoice(
		periods,
		["2027-1"],
		"2026-10-12",
		undefined,
	);
	assert.equal(choice.defaultCode, "2027-1");
	assert.equal(choice.defaultIsCurrent, false);
	assert.equal(choice.selectedCode, "2027-1");
	const empty = groupPeriodChoice(periods, [], "2026-10-12", undefined);
	assert.deepEqual(empty.options, []);
	assert.equal(empty.defaultCode, null);
	assert.equal(empty.selectedCode, null);
});
