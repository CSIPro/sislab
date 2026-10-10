import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/index.ts";
import { requireRole } from "./auth.server.ts";
import { createFirstUsableOperations } from "./first-usable-operations.ts";
import {
	deactivateProfessorGroup,
	getProfessorGroup,
	listProfessorGroups,
	reactivateProfessorGroup,
} from "./groups.ts";
import {
	parseGroupId,
	parseGroupInput,
	parseId,
} from "./group-function-validation.ts";

const firstUsableOperations = createFirstUsableOperations(db, async () =>
	requireRole("professor"),
);

export const listMyGroupsFn = createServerFn({ method: "GET" })
	.validator((input: unknown) => {
		if (!input || typeof input !== "object") return { includeInactive: false };
		const { includeInactive } = input as Record<string, unknown>;
		if (includeInactive !== undefined && typeof includeInactive !== "boolean")
			throw new Error("Choose whether to include inactive groups.");
		return { includeInactive: includeInactive === true };
	})
	.handler(async ({ data }) =>
		listProfessorGroups(
			db,
			await requireRole("professor"),
			data.includeInactive,
		),
	);

export const getMyGroupFn = createServerFn({ method: "GET" })
	.validator(parseGroupId)
	.handler(async ({ data }) =>
		getProfessorGroup(db, await requireRole("professor"), data.groupId),
	);

export const updateMyGroupFn = createServerFn({ method: "POST" })
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
		firstUsableOperations.updateGroup(
			data.groupId,
			data.input,
		),
	);

export const deactivateMyGroupFn = createServerFn({ method: "POST" })
	.validator(parseGroupId)
	.handler(async ({ data }) =>
		deactivateProfessorGroup(db, await requireRole("professor"), data.groupId),
	);

export const reactivateMyGroupFn = createServerFn({ method: "POST" })
	.validator(parseGroupId)
	.handler(async ({ data }) =>
		reactivateProfessorGroup(db, await requireRole("professor"), data.groupId),
	);
