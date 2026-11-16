import assert from "node:assert/strict";
import { test } from "node:test";
import { allRoles, sortRoles } from "./user-roles.ts";

test("roles list Administración, then Personal de laboratorio, then Docente", () => {
	assert.deepEqual(allRoles, ["admin", "staff", "professor"]);
});

test("a user's roles sort into the same order, whatever order they arrive in", () => {
	assert.deepEqual(sortRoles(["professor", "admin"]), ["admin", "professor"]);
	assert.deepEqual(sortRoles(["professor", "staff", "admin"]), [
		"admin",
		"staff",
		"professor",
	]);
});

test("sorting leaves the given list untouched", () => {
	const roles = ["professor", "staff"] as const;
	const given = [...roles];
	sortRoles(given);
	assert.deepEqual(given, ["professor", "staff"]);
});
