import assert from "node:assert/strict";
import { test } from "node:test";
import { academicPeriodStatus } from "./academic-period.ts";

test("a period is current, upcoming or concluded relative to the current code", () => {
	assert.equal(academicPeriodStatus("2026-2", "2026-2"), "current");
	assert.equal(academicPeriodStatus("2027-1", "2026-2"), "upcoming");
	assert.equal(academicPeriodStatus("2026-1", "2026-2"), "concluded");
	assert.equal(academicPeriodStatus("2025-2", "2026-2"), "concluded");
});
