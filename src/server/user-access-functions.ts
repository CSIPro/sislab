import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/index.ts";
import { requireRole } from "./auth.server.ts";
import {
	listUsers,
	replaceUserPassword,
	setUserActive,
	setUserRoles,
	type UserRole,
} from "./user-access.ts";

export const listUsersFn = createServerFn({ method: "GET" }).handler(async () =>
	listUsers(db, await requireRole("admin")),
);

export const setUserRolesFn = createServerFn({ method: "POST" })
	.validator(parseRoleChange)
	.handler(async ({ data }) =>
		setUserRoles(db, data.userId, data.roles, await requireRole("admin")),
	);

export const setUserActiveFn = createServerFn({ method: "POST" })
	.validator(parseActivityChange)
	.handler(async ({ data }) =>
		setUserActive(db, data.userId, data.active, await requireRole("admin")),
	);

export const replaceUserPasswordFn = createServerFn({ method: "POST" })
	.validator(parsePasswordReplacement)
	.handler(async ({ data }) => {
		await replaceUserPassword(
			db,
			data.userId,
			data.password,
			await requireRole("admin"),
		);
		return { ok: true as const };
	});

function parseRoleChange(input: unknown): {
	userId: string;
	roles: UserRole[];
} {
	const data = record(input);
	if (
		typeof data.userId !== "string" ||
		!/^[0-9a-f-]{36}$/i.test(data.userId) ||
		!Array.isArray(data.roles) ||
		data.roles.some(
			(role) => !["professor", "staff", "admin"].includes(String(role)),
		)
	) {
		throw new Error("Choose a valid user and roles.");
	}
	return { userId: data.userId, roles: data.roles as UserRole[] };
}

function parseActivityChange(input: unknown): {
	userId: string;
	active: boolean;
} {
	const data = record(input);
	if (
		typeof data.userId !== "string" ||
		!/^[0-9a-f-]{36}$/i.test(data.userId) ||
		typeof data.active !== "boolean"
	) {
		throw new Error("Choose a valid user and activity state.");
	}
	return { userId: data.userId, active: data.active };
}

function parsePasswordReplacement(input: unknown): {
	userId: string;
	password: string;
} {
	const data = record(input);
	if (
		typeof data.userId !== "string" ||
		!/^[0-9a-f-]{36}$/i.test(data.userId) ||
		typeof data.password !== "string"
	) {
		throw new Error("Choose a valid user and replacement password.");
	}
	return { userId: data.userId, password: data.password };
}

function record(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== "object")
		throw new Error("User details are required.");
	return input as Record<string, unknown>;
}
