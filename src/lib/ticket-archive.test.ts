import assert from "node:assert/strict";
import { test } from "node:test";
import { planTicketArchive } from "./ticket-archive.ts";

test("makes one folder per period and one PDF per ticket day, named by its date", () => {
	const plan = planTicketArchive(["2026-1", "2026-2"], {
		"2026-1": ["2026-03-02", "2026-03-09"],
		"2026-2": ["2026-09-07"],
	});
	assert.deepEqual(plan.entries, [
		{
			periodCode: "2026-1",
			date: "2026-03-02",
			path: "2026-1/sislab-2026-03-02.pdf",
		},
		{
			periodCode: "2026-1",
			date: "2026-03-09",
			path: "2026-1/sislab-2026-03-09.pdf",
		},
		{
			periodCode: "2026-2",
			date: "2026-09-07",
			path: "2026-2/sislab-2026-09-07.pdf",
		},
	]);
});

test("lists the periods in the order given and each period's days oldest first", () => {
	const plan = planTicketArchive(["2026-2", "2026-1"], {
		"2026-1": ["2026-03-09", "2026-03-02"],
		"2026-2": ["2026-09-07"],
	});
	assert.deepEqual(
		plan.entries.map((entry) => entry.path),
		[
			"2026-2/sislab-2026-09-07.pdf",
			"2026-1/sislab-2026-03-02.pdf",
			"2026-1/sislab-2026-03-09.pdf",
		],
	);
});

test("names the zip after the periods", () => {
	assert.equal(
		planTicketArchive(["2026-1", "2026-2"], {}).fileName,
		"sislab-tickets-2026-1_2026-2.zip",
	);
	assert.equal(
		planTicketArchive(["2026-V"], {}).fileName,
		"sislab-tickets-2026-V.zip",
	);
});

test("a period with no ticket days adds no folder, and no days at all gives an empty plan", () => {
	const some = planTicketArchive(["2026-1", "2026-2"], {
		"2026-1": [],
		"2026-2": ["2026-09-07"],
	});
	assert.deepEqual(
		some.entries.map((entry) => entry.periodCode),
		["2026-2"],
	);
	assert.deepEqual(planTicketArchive(["2026-1"], { "2026-1": [] }).entries, []);
	assert.deepEqual(planTicketArchive(["2026-1"], {}).entries, []);
});
