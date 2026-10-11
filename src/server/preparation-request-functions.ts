import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/index.ts";
import { requireRole } from "./auth.server.ts";
import {
	decideLateException,
	getDailyTicketRequests,
	getMinimumNoticeDays,
	getPreparationRequestOptions,
	listAllPreparationRequests,
	listMyPreparationRequests,
	type RequestCustomization,
	submitPreparationRequest,
	updateMinimumNoticeDays,
	voidPreparationRequest,
} from "./preparation-requests.ts";

export const getPreparationRequestOptionsFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const actor = await requireRole("professor");
	return getPreparationRequestOptions(db, actor);
});

export const getMinimumNoticeDaysFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireRole("professor");
		return getMinimumNoticeDays(db);
	},
);

export const setMinimumNoticeDaysFn = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const days = record(input).days;
		if (typeof days !== "number" || !Number.isSafeInteger(days) || days < 0)
			throw new Error("Minimum notice must be a nonnegative whole number.");
		return { days };
	})
	.handler(async ({ data }) =>
		updateMinimumNoticeDays(db, await requireRole("admin"), data.days),
	);

export const listMyPreparationRequestsFn = createServerFn({
	method: "GET",
}).handler(async () =>
	listMyPreparationRequests(db, await requireRole("professor")),
);

export const listAllPreparationRequestsFn = createServerFn({ method: "GET" })
	.validator((input: unknown) => {
		const data = record(input);
		return {
			fromDate: dateValue(data.fromDate),
			throughDate: dateValue(data.throughDate),
		};
	})
	.handler(async ({ data }) =>
		listAllPreparationRequests(
			db,
			await requireRole("staff"),
			data.fromDate,
			data.throughDate,
		),
	);

export const submitPreparationRequestFn = createServerFn({ method: "POST" })
	.validator(parseSubmission)
	.handler(async ({ data }) =>
		submitPreparationRequest(db, await requireRole("professor"), data),
	);

export const decideLateExceptionFn = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const data = record(input);
		const requestId = uuidValue(data.requestId);
		if (data.decision !== "accepted" && data.decision !== "declined")
			throw new Error("Choose whether to accept or decline the exception.");
		return { requestId, decision: data.decision as "accepted" | "declined" };
	})
	.handler(async ({ data }) =>
		decideLateException(
			db,
			await requireRole("staff"),
			data.requestId,
			data.decision,
		),
	);

export const voidPreparationRequestFn = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const data = record(input);
		if (typeof data.reason !== "string")
			throw new Error("Enter a reason for voiding this request.");
		return { requestId: uuidValue(data.requestId), reason: data.reason };
	})
	.handler(async ({ data }) =>
		voidPreparationRequest(
			db,
			await requireRole("staff"),
			data.requestId,
			data.reason,
		),
	);

export const getDailyTicketRequestsFn = createServerFn({ method: "GET" })
	.validator((input: unknown) => ({ date: dateValue(record(input).date) }))
	.handler(async ({ data }) =>
		getDailyTicketRequests(db, await requireRole("staff"), data.date),
	);

function parseSubmission(input: unknown) {
	const data = record(input);
	if (!data.customization || typeof data.customization !== "object")
		throw new Error("Complete the preparation details before submitting.");
	return {
		groupId: uuidValue(data.groupId),
		exerciseId: uuidValue(data.exerciseId),
		sessionDate: dateValue(data.sessionDate),
		customization: data.customization as RequestCustomization,
	};
}

function record(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== "object")
		throw new Error("Complete the request details.");
	return input as Record<string, unknown>;
}

function uuidValue(value: unknown): string {
	if (
		typeof value !== "string" ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			value,
		)
	)
		throw new Error("Choose a valid preparation request.");
	return value;
}

function dateValue(value: unknown): string {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
		throw new Error("Choose a valid date.");
	const date = new Date(`${value}T12:00:00Z`);
	if (
		!Number.isFinite(date.getTime()) ||
		date.toISOString().slice(0, 10) !== value
	)
		throw new Error("Choose a valid date.");
	return value;
}
