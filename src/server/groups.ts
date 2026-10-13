import { and, eq, gte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../db/schema.ts";
import {
	careers,
	groups,
	labs,
	periods,
	preparationRequests,
	subjects,
} from "../db/schema.ts";
import { byPeriodCode } from "./academic-periods.ts";

export type GroupDatabase = NodePgDatabase<typeof schema>;
export type GroupActor = { id: string; roles: readonly string[] };
export type RegisterGroupInput = {
	periodCode: string;
	number?: number | null;
	labId: string;
	careerId: string;
	subjectId: string;
	students: number;
	teams: number;
	weekday: number;
	startTime: string;
	endTime: string;
};

export async function registerProfessorGroup(
	database: GroupDatabase,
	actor: GroupActor,
	input: RegisterGroupInput,
): Promise<typeof groups.$inferSelect> {
	requireProfessor(actor);
	const normalized = validateInput(input);

	try {
		return await database.transaction(async (transaction) => {
			await transaction.execute(sql`
				SELECT pg_advisory_xact_lock(
					hashtext(${actor.id}), hashtext(${normalized.periodCode})
				)
			`);

			const [period] = await transaction
				.select({ code: periods.code })
				.from(periods)
				.where(eq(periods.code, normalized.periodCode))
				.limit(1);
			if (!period) throw new Error("Choose an available academic period.");

			const [lab] = await transaction
				.select({ id: labs.id, name: labs.name })
				.from(labs)
				.where(and(eq(labs.id, normalized.labId), eq(labs.active, true)))
				.limit(1);
			if (!lab) throw new Error("Choose an active lab.");

			const [career] = await transaction
				.select({ id: careers.id, name: careers.name })
				.from(careers)
				.where(
					and(eq(careers.id, normalized.careerId), eq(careers.active, true)),
				)
				.limit(1);
			if (!career) throw new Error("Choose an active career.");

			const [subject] = await transaction
				.select({ id: subjects.id, name: subjects.name })
				.from(subjects)
				.where(
					and(eq(subjects.id, normalized.subjectId), eq(subjects.active, true)),
				)
				.limit(1);
			if (!subject) throw new Error("Choose an active subject.");

			let number = normalized.number;
			if (number === null) {
				const [current] = await transaction
					.select({ max: sql<number>`COALESCE(MAX(${groups.number}), 0)::int` })
					.from(groups)
					.where(
						and(
							eq(groups.professorId, actor.id),
							eq(groups.periodCode, normalized.periodCode),
						),
					);
				number = Number(current?.max ?? 0) + 1;
			} else {
				const [existing] = await transaction
					.select({ id: groups.id })
					.from(groups)
					.where(
						and(
							eq(groups.professorId, actor.id),
							eq(groups.periodCode, normalized.periodCode),
							eq(groups.number, number),
						),
					)
					.limit(1);
				if (existing)
					throw new Error(
						"That group number has already been used in this period.",
					);
			}

			const [created] = await transaction
				.insert(groups)
				.values({
					professorId: actor.id,
					periodCode: normalized.periodCode,
					number,
					labId: lab.id,
					labName: lab.name,
					careerId: career.id,
					careerName: career.name,
					subjectId: subject.id,
					subjectName: subject.name,
					students: normalized.students,
					teams: normalized.teams,
					weekday: normalized.weekday,
					startTime: normalized.startTime,
					endTime: normalized.endTime,
				})
				.returning();
			if (!created) throw new Error("Could not save this group.");
			return created;
		});
	} catch (error) {
		if (isDatabaseError(error, "23P01", "groups_active_lab_slot_no_overlap")) {
			throw new Error(
				"This lab already has a group during that period and time. Choose another time, day, or lab.",
			);
		}
		if (
			isDatabaseError(error, "23505", "groups_professor_period_number_unique")
		) {
			throw new Error(
				"That group number has already been used in this period.",
			);
		}
		throw error;
	}
}

export async function listProfessorGroups(
	database: GroupDatabase,
	actor: GroupActor,
	includeInactive = false,
): Promise<Array<typeof groups.$inferSelect>> {
	requireProfessor(actor);
	return database
		.select()
		.from(groups)
		.where(
			includeInactive
				? eq(groups.professorId, actor.id)
				: and(eq(groups.professorId, actor.id), eq(groups.active, true)),
		)
		.orderBy(...byPeriodCode(groups.periodCode), groups.number);
}

export async function getProfessorGroup(
	database: GroupDatabase,
	actor: GroupActor,
	groupId: string,
): Promise<typeof groups.$inferSelect> {
	requireProfessor(actor);
	const [group] = await database
		.select()
		.from(groups)
		.where(and(eq(groups.id, groupId), eq(groups.professorId, actor.id)))
		.limit(1);
	if (!group) throw new Error("That group was not found.");
	return group;
}

export async function updateProfessorGroup(
	database: GroupDatabase,
	actor: GroupActor,
	groupId: string,
	input: RegisterGroupInput,
): Promise<typeof groups.$inferSelect> {
	requireProfessor(actor);
	const normalized = validateInput(input);
	try {
		return await database.transaction(async (transaction) => {
			const [current] = await transaction
				.select()
				.from(groups)
				.where(and(eq(groups.id, groupId), eq(groups.professorId, actor.id)))
				.for("update")
				.limit(1);
			if (!current) throw new Error("That group was not found.");
			const changesPreparation =
				current.labId !== normalized.labId ||
				current.weekday !== normalized.weekday ||
				current.startTime !== normalized.startTime ||
				current.endTime !== normalized.endTime ||
				current.teams !== normalized.teams;
			if (
				changesPreparation &&
				(await hasFutureRequest(transaction, current.id))
			) {
				throw new Error(
					"This group has a future preparation request. Its lab, schedule, and team count are locked until the request is voided or its session date passes.",
				);
			}

			for (const periodCode of [
				...new Set([current.periodCode, normalized.periodCode]),
			].sort()) {
				await transaction.execute(sql`
					SELECT pg_advisory_xact_lock(hashtext(${actor.id}), hashtext(${periodCode}))
				`);
			}

			const [period] = await transaction
				.select({ code: periods.code })
				.from(periods)
				.where(eq(periods.code, normalized.periodCode))
				.limit(1);
			if (!period) throw new Error("Choose an available academic period.");

			const number = normalized.number ?? current.number;
			const [lab] = await transaction
				.select({ id: labs.id, name: labs.name, active: labs.active })
				.from(labs)
				.where(eq(labs.id, normalized.labId))
				.limit(1);
			if (!lab || (!lab.active && lab.id !== current.labId))
				throw new Error("Choose an active lab.");

			const [career] = await transaction
				.select({ id: careers.id, name: careers.name, active: careers.active })
				.from(careers)
				.where(eq(careers.id, normalized.careerId))
				.limit(1);
			if (!career || (!career.active && career.id !== current.careerId))
				throw new Error("Choose an active career.");

			const [subject] = await transaction
				.select({
					id: subjects.id,
					name: subjects.name,
					active: subjects.active,
				})
				.from(subjects)
				.where(eq(subjects.id, normalized.subjectId))
				.limit(1);
			if (!subject || (!subject.active && subject.id !== current.subjectId))
				throw new Error("Choose an active subject.");

			const [updated] = await transaction
				.update(groups)
				.set({
					periodCode: normalized.periodCode,
					number,
					labId: lab.id,
					labName: lab.id === current.labId ? current.labName : lab.name,
					careerId: career.id,
					careerName:
						career.id === current.careerId ? current.careerName : career.name,
					subjectId: subject.id,
					subjectName:
						subject.id === current.subjectId
							? current.subjectName
							: subject.name,
					students: normalized.students,
					teams: normalized.teams,
					weekday: normalized.weekday,
					startTime: normalized.startTime,
					endTime: normalized.endTime,
				})
				.where(eq(groups.id, current.id))
				.returning();
			if (!updated) throw new Error("Could not save this group.");
			return updated;
		});
	} catch (error) {
		throw translateGroupConstraint(error);
	}
}

export async function deactivateProfessorGroup(
	database: GroupDatabase,
	actor: GroupActor,
	groupId: string,
): Promise<typeof groups.$inferSelect> {
	requireProfessor(actor);
	return database.transaction(async (transaction) => {
		const [current] = await transaction
			.select()
			.from(groups)
			.where(and(eq(groups.id, groupId), eq(groups.professorId, actor.id)))
			.for("update")
			.limit(1);
		if (!current) throw new Error("That group was not found.");
		if (await hasFutureRequest(transaction, current.id)) {
			throw new Error(
				"This group has a future preparation request. It cannot be deactivated until the request is voided or its session date passes.",
			);
		}
		const [deactivated] = await transaction
			.update(groups)
			.set({ active: false })
			.where(eq(groups.id, current.id))
			.returning();
		if (!deactivated) throw new Error("That group was not found.");
		return deactivated;
	});
}

export async function reactivateProfessorGroup(
	database: GroupDatabase,
	actor: GroupActor,
	groupId: string,
): Promise<typeof groups.$inferSelect> {
	requireProfessor(actor);
	try {
		return await database.transaction(async (transaction) => {
			const [current] = await transaction
				.select()
				.from(groups)
				.where(and(eq(groups.id, groupId), eq(groups.professorId, actor.id)))
				.for("update")
				.limit(1);
			if (!current) throw new Error("That group was not found.");
			if (!current.active) {
				await transaction.execute(sql`
					SELECT pg_advisory_xact_lock(hashtext(${actor.id}), hashtext(${current.periodCode}))
				`);
			}
			const [lab] = await transaction
				.select({ active: labs.active })
				.from(labs)
				.where(eq(labs.id, current.labId))
				.limit(1);
			if (!lab?.active)
				throw new Error("Choose an active lab before reactivating this group.");
			const [reactivated] = await transaction
				.update(groups)
				.set({ active: true })
				.where(eq(groups.id, current.id))
				.returning();
			if (!reactivated) throw new Error("Could not reactivate this group.");
			return reactivated;
		});
	} catch (error) {
		throw translateGroupConstraint(error);
	}
}

function translateGroupConstraint(error: unknown): unknown {
	if (isDatabaseError(error, "23P01", "groups_active_lab_slot_no_overlap")) {
		return new Error(
			"This lab already has a group during that period and time. Choose another time, day, or lab.",
		);
	}
	if (
		isDatabaseError(error, "23505", "groups_professor_period_number_unique")
	) {
		return new Error("That group number has already been used in this period.");
	}
	return error;
}

async function hasFutureRequest(
	database: Pick<GroupDatabase, "select">,
	groupId: string,
): Promise<boolean> {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/Hermosillo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const dateParts = Object.fromEntries(
		parts.map((part) => [part.type, part.value]),
	);
	const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
	const [request] = await database
		.select({ id: preparationRequests.id })
		.from(preparationRequests)
		.where(
			and(
				eq(preparationRequests.groupId, groupId),
				gte(preparationRequests.sessionDate, today),
				sql`${preparationRequests.status} <> 'voided'`,
			),
		)
		.limit(1);
	return !!request;
}

function requireProfessor(actor: GroupActor): void {
	if (!actor.roles.includes("professor"))
		throw new Error("Professor access is required to register a group.");
}

function validateInput(
	input: RegisterGroupInput,
): RegisterGroupInput & { number: number | null } {
	const periodCode = input.periodCode.trim();
	if (!periodCode) throw new Error("Choose an available academic period.");
	for (const [label, id] of [
		["lab", input.labId],
		["career", input.careerId],
		["subject", input.subjectId],
	] as const) {
		if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
			throw new Error(`Choose a valid ${label}.`);
	}
	if (
		input.number !== null &&
		input.number !== undefined &&
		(!Number.isInteger(input.number) || input.number < 1)
	) {
		throw new Error("Group number must be a positive whole number.");
	}
	if (
		!Number.isInteger(input.students) ||
		input.students < 1 ||
		input.students > 60
	) {
		throw new Error("Student count must be between 1 and 60.");
	}
	if (
		!Number.isInteger(input.teams) ||
		input.teams < 1 ||
		input.teams > input.students
	) {
		throw new Error("Team count must be between 1 and the student count.");
	}
	if (
		!Number.isInteger(input.weekday) ||
		input.weekday < 0 ||
		input.weekday > 6
	) {
		throw new Error("Choose a valid weekday.");
	}
	const startTime = normalizeTime(input.startTime);
	const endTime = normalizeTime(input.endTime);
	if (endTime <= startTime) throw new Error("End time must follow start time.");
	return {
		...input,
		periodCode,
		number: input.number ?? null,
		startTime,
		endTime,
	};
}

function normalizeTime(value: string): string {
	if (
		typeof value !== "string" ||
		!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
	) {
		throw new Error("Enter a valid start and end time.");
	}
	return value.length === 5 ? `${value}:00` : value;
}

function isDatabaseError(
	error: unknown,
	code: string,
	constraint: string,
): boolean {
	if (!error || typeof error !== "object") return false;
	const candidate = error as {
		code?: string;
		constraint?: string;
		cause?: unknown;
	};
	if (candidate.code === code && candidate.constraint === constraint)
		return true;
	return isDatabaseError(candidate.cause, code, constraint);
}
