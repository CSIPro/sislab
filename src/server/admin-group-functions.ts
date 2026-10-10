import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/index.ts";
import { listAcademicPeriods } from "./academic-periods.ts";
import {
	deactivateAnyGroup,
	getAnyGroup,
	listAllGroups,
	reactivateAnyGroup,
	updateAnyGroup,
} from "./admin-groups.ts";
import { requireRole } from "./auth.server.ts";
import { listActiveCatalogEntries } from "./catalogs.ts";
import type { RegisterGroupInput } from "./groups.ts";

export const getAdminGroupOptionsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireRole("admin");
		const [periodOptions, labs, careers, subjects] = await Promise.all([
			listAcademicPeriods(db),
			listActiveCatalogEntries(db, "labs"),
			listActiveCatalogEntries(db, "careers"),
			listActiveCatalogEntries(db, "subjects"),
		]);
		return { ...periodOptions, labs, careers, subjects };
	},
);

export const listAllGroupsFn = createServerFn({ method: "GET" })
	.validator((input: unknown) => {
		if (!input || typeof input !== "object") return { includeInactive: true };
		const { includeInactive } = input as Record<string, unknown>;
		if (includeInactive !== undefined && typeof includeInactive !== "boolean")
			throw new Error("Choose whether to include inactive groups.");
		return { includeInactive: includeInactive !== false };
	})
	.handler(async ({ data }) =>
		listAllGroups(db, await requireRole("admin"), data.includeInactive),
	);

export const getAnyGroupFn = createServerFn({ method: "GET" })
	.validator(parseGroupId)
	.handler(async ({ data }) =>
		getAnyGroup(db, await requireRole("admin"), data.groupId),
	);

export const updateAnyGroupFn = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		if (!input || typeof input !== "object")
			throw new Error("Group details are required.");
		const data = input as Record<string, unknown>;
		return {
			groupId: parseId(data.groupId),
			input: parseGroupInput(data.input),
		};
	})
	.handler(async ({ data }) =>
		updateAnyGroup(db, await requireRole("admin"), data.groupId, data.input),
	);

export const deactivateAnyGroupFn = createServerFn({ method: "POST" })
	.validator(parseGroupId)
	.handler(async ({ data }) =>
		deactivateAnyGroup(db, await requireRole("admin"), data.groupId),
	);

export const reactivateAnyGroupFn = createServerFn({ method: "POST" })
	.validator(parseGroupId)
	.handler(async ({ data }) =>
		reactivateAnyGroup(db, await requireRole("admin"), data.groupId),
	);

function parseGroupId(input: unknown): { groupId: string } {
	if (!input || typeof input !== "object")
		throw new Error("Group details are required.");
	return { groupId: parseId((input as Record<string, unknown>).groupId) };
}

function parseId(input: unknown): string {
	if (typeof input !== "string" || !/^[0-9a-f-]{36}$/i.test(input))
		throw new Error("Choose a valid group.");
	return input;
}

function parseGroupInput(input: unknown): RegisterGroupInput {
	if (!input || typeof input !== "object")
		throw new Error("Group details are required.");
	const data = input as Record<string, unknown>;
	if (
		typeof data.periodCode !== "string" ||
		typeof data.labId !== "string" ||
		typeof data.careerId !== "string" ||
		typeof data.subjectId !== "string" ||
		typeof data.students !== "number" ||
		typeof data.teams !== "number" ||
		typeof data.weekday !== "number" ||
		typeof data.startTime !== "string" ||
		typeof data.endTime !== "string"
	)
		throw new Error("Enter all group details before saving.");
	if (
		data.number !== null &&
		data.number !== undefined &&
		typeof data.number !== "number"
	)
		throw new Error("Group number must be a positive whole number.");
	return {
		periodCode: data.periodCode,
		number: data.number as number | null | undefined,
		labId: data.labId,
		careerId: data.careerId,
		subjectId: data.subjectId,
		students: data.students,
		teams: data.teams,
		weekday: data.weekday,
		startTime: data.startTime,
		endTime: data.endTime,
	};
}
