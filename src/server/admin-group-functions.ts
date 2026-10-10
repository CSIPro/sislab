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
import {
	parseGroupId,
	parseGroupInput,
	parseId,
} from "./group-function-validation.ts";

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
