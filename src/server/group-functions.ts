import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/index.ts";
import { requireUser } from "./auth.server.ts";
import type { RegisterGroupInput } from "./groups.ts";
import { createFirstUsableOperations } from "./first-usable-operations.ts";

const firstUsableOperations = createFirstUsableOperations(db, requireUser);

export const getProfessorGroupOptionsFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return firstUsableOperations.getGroupOptions();
});

export const registerProfessorGroupFn = createServerFn({ method: "POST" })
	.validator(parseRegisterGroupInput)
	.handler(async ({ data }) =>
		firstUsableOperations.registerGroup(data),
	);

function parseRegisterGroupInput(input: unknown): RegisterGroupInput {
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
	) {
		throw new Error(
			"Enter a period, lab, career, subject, class size, teams, day, and time.",
		);
	}
	if (
		data.number !== null &&
		data.number !== undefined &&
		typeof data.number !== "number"
	) {
		throw new Error(
			"Group number must be a positive whole number, or left blank for automatic numbering.",
		);
	}
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
