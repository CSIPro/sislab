import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/index.ts";
import { requireRole } from "./auth.server.ts";
import {
	getMinimumNoticeDays,
	saveMinimumNoticeDays,
} from "./minimum-notice.ts";

export const getMinimumNoticeDaysFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireRole("admin");
		return getMinimumNoticeDays(db);
	},
);

export const saveMinimumNoticeDaysFn = createServerFn({ method: "POST" })
	.validator(parseMinimumNoticeDays)
	.handler(async ({ data }) => {
		await requireRole("admin");
		return saveMinimumNoticeDays(db, data.minNoticeDays);
	});

function parseMinimumNoticeDays(input: unknown): { minNoticeDays: number } {
	if (!input || typeof input !== "object") {
		throw new Error("Ingresa el aviso mínimo en días.");
	}
	const minNoticeDays = (input as Record<string, unknown>).minNoticeDays;
	if (typeof minNoticeDays !== "number") {
		throw new Error("Ingresa el aviso mínimo en días.");
	}
	return { minNoticeDays };
}
