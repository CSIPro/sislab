import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/index.ts";
import {
	activatePendingAccount,
	listPendingAccounts,
	type SignUpInput,
	signUp,
} from "./accounts.ts";
import { requireRole } from "./auth.server.ts";

export const signUpFn = createServerFn({ method: "POST" })
	.validator(parseSignUpInput)
	.handler(async ({ data }) => signUp(db, data));

export const listPendingAccountsFn = createServerFn({ method: "GET" }).handler(
	async () => listPendingAccounts(db, await requireRole("admin")),
);

export const activatePendingAccountFn = createServerFn({ method: "POST" })
	.validator(parseUserId)
	.handler(async ({ data }) =>
		activatePendingAccount(db, data.userId, await requireRole("admin")),
	);

function parseSignUpInput(input: unknown): SignUpInput {
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

function parseUserId(input: unknown): { userId: string } {
	const userId = record(input).userId;
	if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) {
		throw new Error("Choose a valid pending account.");
	}
	return { userId };
}

function record(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== "object")
		throw new Error("Account details are required.");
	return input as Record<string, unknown>;
}
