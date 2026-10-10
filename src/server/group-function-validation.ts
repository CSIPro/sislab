import type { RegisterGroupInput } from "./groups.ts";

export function parseGroupId(input: unknown): { groupId: string } {
	if (!input || typeof input !== "object")
		throw new Error("Group details are required.");
	return { groupId: parseId((input as Record<string, unknown>).groupId) };
}

export function parseId(input: unknown): string {
	if (typeof input !== "string" || !/^[0-9a-f-]{36}$/i.test(input))
		throw new Error("Choose a valid group.");
	return input;
}

export function parseGroupInput(input: unknown): RegisterGroupInput {
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
