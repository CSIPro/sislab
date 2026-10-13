import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/index.ts";
import {
	type AccountRole,
	countAccessRequests,
	listPendingAccounts,
} from "./accounts.ts";
import { requireRole, requireUser } from "./auth.server.ts";
import { createFirstUsableOperations } from "./first-usable-operations.ts";

const firstUsableOperations = createFirstUsableOperations(db, requireUser);

export const signUpFn = createServerFn({ method: "POST" })
	.validator(parseSignUpInput)
	.handler(async ({ data }) => firstUsableOperations.signUp(data));

export const listPendingAccountsFn = createServerFn({ method: "GET" }).handler(
	async () => listPendingAccounts(db, await requireRole("admin")),
);

export const countAccessRequestsFn = createServerFn({ method: "GET" }).handler(
	async () => countAccessRequests(db, await requireRole("admin")),
);

export const activatePendingAccountFn = createServerFn({ method: "POST" })
	.validator(parseActivation)
	.handler(async ({ data }) =>
		firstUsableOperations.activateAccount(data.userId, data.roles),
	);

function parseSignUpInput(input: unknown) {
	const data = record(input);
	if (
		typeof data.email !== "string" ||
		typeof data.name !== "string" ||
		typeof data.surname !== "string" ||
		typeof data.password !== "string"
	) {
		throw new Error("Enter your name, email, and password.");
	}
	return {
		email: data.email,
		name: data.name,
		surname: data.surname,
		password: data.password,
	};
}

const accountRoles: AccountRole[] = ["professor", "staff", "admin"];

function parseActivation(input: unknown): {
	userId: string;
	roles?: AccountRole[];
} {
	const { userId, roles } = record(input);
	if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) {
		throw new Error("Choose a valid pending account.");
	}
	if (roles === undefined) return { userId };
	if (
		!Array.isArray(roles) ||
		!roles.every((role) => accountRoles.includes(role))
	) {
		throw new Error("Choose valid roles for the account.");
	}
	return { userId, roles };
}

function record(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== "object")
		throw new Error("Account details are required.");
	return input as Record<string, unknown>;
}
