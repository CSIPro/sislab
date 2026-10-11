import { and, asc, eq, gte, lte, ne, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { alias } from "drizzle-orm/pg-core";
import type * as schema from "../db/schema.ts";
import {
	type ExerciseMaterials,
	groups,
	labExercises,
	preparationRequests,
	type QuantityItem,
	type RequestMaterials,
	settings,
	users,
	type WasteItem,
} from "../db/schema.ts";
import { listActiveLabExercises } from "./lab-exercises.ts";

type Database = NodePgDatabase<typeof schema>;
export type RequestActor = { id: string; roles: readonly string[] };
export type RequestCustomization = {
	omittedReagents: string[];
	addedReagents: QuantityItem[];
	addedEquipment: QuantityItem[];
	addedWaste: WasteItem[];
	professorNote: string | null;
	lateReason: string | null;
};
export type RequestListRow = {
	request: typeof preparationRequests.$inferSelect;
	group: { id: string; number: number; subjectName: string; teams: number };
	professor: { id: string; name: string; surname: string };
	voidedBy: { name: string; surname: string } | null;
};

export async function getPreparationRequestOptions(
	database: Database,
	actor: RequestActor,
) {
	requireProfessor(actor);
	const [ownedGroups, exercises, minimumNoticeDays] = await Promise.all([
		database
			.select()
			.from(groups)
			.where(and(eq(groups.professorId, actor.id), eq(groups.active, true)))
			.orderBy(groups.periodCode, groups.number),
		listActiveLabExercises(database),
		getMinimumNoticeDays(database),
	]);
	return { groups: ownedGroups, exercises, minimumNoticeDays };
}

export async function getMinimumNoticeDays(
	database: Database,
): Promise<number> {
	const [row] = await database
		.select({ days: settings.minNoticeDays })
		.from(settings)
		.where(eq(settings.id, 1))
		.limit(1);
	if (row) return row.days;
	const [created] = await database
		.insert(settings)
		.values({ id: 1, minNoticeDays: 7 })
		.onConflictDoNothing()
		.returning({ days: settings.minNoticeDays });
	if (created) return created.days;
	const [retried] = await database
		.select({ days: settings.minNoticeDays })
		.from(settings)
		.where(eq(settings.id, 1))
		.limit(1);
	return retried?.days ?? 7;
}

export async function updateMinimumNoticeDays(
	database: Database,
	actor: RequestActor,
	days: number,
): Promise<number> {
	requireAdmin(actor);
	if (!Number.isSafeInteger(days) || days < 0)
		throw new Error("Minimum notice must be a nonnegative whole number.");
	const [row] = await database
		.insert(settings)
		.values({ id: 1, minNoticeDays: days })
		.onConflictDoUpdate({ target: settings.id, set: { minNoticeDays: days } })
		.returning({ days: settings.minNoticeDays });
	if (!row) throw new Error("Could not save the minimum notice setting.");
	return row.days;
}

export async function listMyPreparationRequests(
	database: Database,
	actor: RequestActor,
): Promise<RequestListRow[]> {
	requireProfessor(actor);
	const voidingUsers = alias(users, "voiding_users");
	return database
		.select({
			request: preparationRequests,
			group: {
				id: groups.id,
				number: groups.number,
				subjectName: groups.subjectName,
				teams: groups.teams,
			},
			professor: { id: users.id, name: users.name, surname: users.surname },
			voidedBy: { name: voidingUsers.name, surname: voidingUsers.surname },
		})
		.from(preparationRequests)
		.innerJoin(groups, eq(groups.id, preparationRequests.groupId))
		.innerJoin(users, eq(users.id, preparationRequests.professorId))
		.leftJoin(voidingUsers, eq(voidingUsers.id, preparationRequests.voidedBy))
		.where(eq(preparationRequests.professorId, actor.id))
		.orderBy(
			asc(preparationRequests.sessionDate),
			asc(preparationRequests.startTime),
		);
}

export async function listAllPreparationRequests(
	database: Database,
	actor: RequestActor,
	fromDate: string,
	throughDate: string,
): Promise<RequestListRow[]> {
	requireStaff(actor);
	if (!isDate(fromDate) || !isDate(throughDate) || fromDate > throughDate)
		throw new Error("Choose a valid date range.");
	const voidingUsers = alias(users, "voiding_users");
	return database
		.select({
			request: preparationRequests,
			group: {
				id: groups.id,
				number: groups.number,
				subjectName: groups.subjectName,
				teams: groups.teams,
			},
			professor: { id: users.id, name: users.name, surname: users.surname },
			voidedBy: { name: voidingUsers.name, surname: voidingUsers.surname },
		})
		.from(preparationRequests)
		.innerJoin(groups, eq(groups.id, preparationRequests.groupId))
		.innerJoin(users, eq(users.id, preparationRequests.professorId))
		.leftJoin(voidingUsers, eq(voidingUsers.id, preparationRequests.voidedBy))
		.where(
			and(
				gte(preparationRequests.sessionDate, fromDate),
				lte(preparationRequests.sessionDate, throughDate),
			),
		)
		.orderBy(
			asc(preparationRequests.sessionDate),
			asc(preparationRequests.startTime),
		);
}

export async function submitPreparationRequest(
	database: Database,
	actor: RequestActor,
	input: {
		groupId: string;
		exerciseId: string;
		sessionDate: string;
		customization: RequestCustomization;
	},
) {
	requireProfessor(actor);
	if (!isUuid(input.groupId) || !isUuid(input.exerciseId))
		throw new Error("Choose a valid group and lab exercise.");
	if (!isDate(input.sessionDate))
		throw new Error("Choose a valid session date.");
	const customization = normalizeCustomization(input.customization);
	try {
		return await database.transaction(async (transaction) => {
			const [group] = await transaction
				.select()
				.from(groups)
				.where(
					and(
						eq(groups.id, input.groupId),
						eq(groups.professorId, actor.id),
						eq(groups.active, true),
					),
				)
				.for("update")
				.limit(1);
			if (!group) throw new Error("Choose one of your active groups.");
			const [exercise] = await transaction
				.select()
				.from(labExercises)
				.where(
					and(
						eq(labExercises.id, input.exerciseId),
						eq(labExercises.active, true),
					),
				)
				.limit(1);
			if (!exercise) throw new Error("Choose an active lab exercise.");
			const today = hermosilloDateTime();
			const requestedDay = new Date(
				`${input.sessionDate}T12:00:00Z`,
			).getUTCDay();
			if (input.sessionDate < today.date || requestedDay !== group.weekday)
				throw new Error(
					"Choose today or a future date on your group's scheduled weekday.",
				);
			if (
				input.sessionDate === today.date &&
				today.time >= group.startTime.slice(0, 5)
			)
				throw new Error("Requests close when your group session starts.");
			const noticeDays = await getMinimumNoticeDays(
				transaction as unknown as Database,
			);
			const daysAhead = calendarDaysBetween(today.date, input.sessionDate);
			const isLate = daysAhead < noticeDays;
			if (isLate && !customization.lateReason)
				throw new Error(
					"Add a reason for requesting this date with short notice.",
				);
			const materials = snapshotMaterials(
				exercise.materials,
				group.teams,
				customization,
			);
			const [created] = await transaction
				.insert(preparationRequests)
				.values({
					groupId: group.id,
					professorId: actor.id,
					exerciseId: exercise.id,
					exerciseNumber: exercise.number,
					exerciseName: exercise.name,
					sessionDate: input.sessionDate,
					labId: group.labId,
					labName: group.labName,
					startTime: group.startTime,
					endTime: group.endTime,
					materials,
					professorNote: customization.professorNote,
					lateReason: isLate ? customization.lateReason : null,
				})
				.returning();
			if (!created)
				throw new Error("Could not submit this preparation request.");
			return created;
		});
	} catch (error) {
		if (isDatabaseError(error, "23505", "requests_active_group_date_unique"))
			throw new Error(
				"A request already uses this group and date. Choose another date or contact lab staff if it was submitted by mistake.",
			);
		throw error;
	}
}

export async function decideLateException(
	database: Database,
	actor: RequestActor,
	requestId: string,
	decision: "accepted" | "declined",
) {
	requireStaff(actor);
	if (!isUuid(requestId))
		throw new Error("Choose a valid preparation request.");
	return database.transaction(async (transaction) => {
		const [current] = await transaction
			.select()
			.from(preparationRequests)
			.where(eq(preparationRequests.id, requestId))
			.for("update")
			.limit(1);
		if (!current || current.status === "voided" || !current.lateReason)
			throw new Error("This request has no pending short-notice exception.");
		if (current.lateAcceptedAt || current.lateDeclinedAt)
			throw new Error(
				"A decision has already been recorded for this exception.",
			);
		const stamp = new Date();
		const [updated] = await transaction
			.update(preparationRequests)
			.set(
				decision === "accepted"
					? { lateAcceptedBy: actor.id, lateAcceptedAt: stamp }
					: { lateDeclinedBy: actor.id, lateDeclinedAt: stamp },
			)
			.where(eq(preparationRequests.id, requestId))
			.returning();
		if (!updated) throw new Error("Could not save the exception decision.");
		return updated;
	});
}

export async function voidPreparationRequest(
	database: Database,
	actor: RequestActor,
	requestId: string,
	reason: string,
) {
	requireStaff(actor);
	if (!isUuid(requestId))
		throw new Error("Choose a valid preparation request.");
	const normalizedReason = reason.trim();
	if (!normalizedReason)
		throw new Error("Enter a reason for voiding this request.");
	return database.transaction(async (transaction) => {
		const [current] = await transaction
			.select()
			.from(preparationRequests)
			.where(eq(preparationRequests.id, requestId))
			.for("update")
			.limit(1);
		if (!current) throw new Error("Preparation request not found.");
		if (current.status === "voided")
			throw new Error("This preparation request has already been voided.");
		const [updated] = await transaction
			.update(preparationRequests)
			.set({
				status: "voided",
				voidReason: normalizedReason,
				voidedBy: actor.id,
				voidedAt: new Date(),
			})
			.where(eq(preparationRequests.id, requestId))
			.returning();
		if (!updated) throw new Error("Could not void this preparation request.");
		return updated;
	});
}

export async function getDailyTicketRequests(
	database: Database,
	actor: RequestActor,
	date: string,
): Promise<RequestListRow[]> {
	requireStaff(actor);
	if (!isDate(date)) throw new Error("Choose a valid ticket date.");
	const voidingUsers = alias(users, "voiding_users");
	return database
		.select({
			request: preparationRequests,
			group: {
				id: groups.id,
				number: groups.number,
				subjectName: groups.subjectName,
				teams: groups.teams,
			},
			professor: { id: users.id, name: users.name, surname: users.surname },
			voidedBy: { name: voidingUsers.name, surname: voidingUsers.surname },
		})
		.from(preparationRequests)
		.innerJoin(groups, eq(groups.id, preparationRequests.groupId))
		.innerJoin(users, eq(users.id, preparationRequests.professorId))
		.leftJoin(voidingUsers, eq(voidingUsers.id, preparationRequests.voidedBy))
		.where(
			and(
				eq(preparationRequests.sessionDate, date),
				ne(preparationRequests.status, "voided"),
				sql`(${preparationRequests.lateReason} IS NULL OR ${preparationRequests.lateAcceptedAt} IS NOT NULL)`,
			),
		)
		.orderBy(
			asc(preparationRequests.exerciseName),
			asc(users.surname),
			asc(groups.number),
			asc(preparationRequests.startTime),
		);
}

function snapshotMaterials(
	exercise: ExerciseMaterials,
	teams: number,
	customization: RequestCustomization,
): RequestMaterials {
	const omitted = new Set(customization.omittedReagents);
	return {
		reagents: exercise.reagents
			.filter((item) => !omitted.has(item.name))
			.map((item) => ({
				...item,
				totalAmount: item.amount * (item.basis === "team" ? teams : 1),
			})),
		equipment: exercise.equipment.map((item) => ({
			...item,
			totalAmount: item.amount * (item.basis === "team" ? teams : 1),
		})),
		waste: exercise.waste.map((item) => ({ ...item })),
		omittedReagents: exercise.reagents
			.filter((item) => omitted.has(item.name))
			.map((item) => item.name),
		addedReagents: customization.addedReagents.map((item) => ({
			...item,
			totalAmount: item.amount * (item.basis === "team" ? teams : 1),
		})),
		addedEquipment: customization.addedEquipment.map((item) => ({
			...item,
			totalAmount: item.amount * (item.basis === "team" ? teams : 1),
		})),
		addedWaste: customization.addedWaste.map((item) => ({ ...item })),
	};
}

function normalizeCustomization(
	input: RequestCustomization,
): RequestCustomization {
	if (!input || typeof input !== "object")
		throw new Error("Complete the preparation details before submitting.");
	const omitted = stringArray(
		input.omittedReagents,
		"Choose valid reagents to omit.",
	);
	return {
		omittedReagents: omitted,
		addedReagents: normalizeQuantityItems(input.addedReagents),
		addedEquipment: normalizeQuantityItems(input.addedEquipment),
		addedWaste: normalizeWasteItems(input.addedWaste),
		professorNote: normalizeOptionalText(
			input.professorNote,
			"Enter a valid note.",
			2000,
		),
		lateReason: normalizeOptionalText(
			input.lateReason,
			"Enter a valid short-notice reason.",
			1000,
		),
	};
}

function normalizeQuantityItems(value: unknown): QuantityItem[] {
	if (!Array.isArray(value)) throw new Error("Enter valid material details.");
	return value.map((candidate) => {
		if (!candidate || typeof candidate !== "object")
			throw new Error("Enter valid material details.");
		const item = candidate as Record<string, unknown>;
		const name = typeof item.name === "string" ? item.name.trim() : "";
		const unit = typeof item.unit === "string" ? item.unit.trim() : "";
		if (
			!name ||
			!unit ||
			typeof item.amount !== "number" ||
			!Number.isFinite(item.amount) ||
			item.amount <= 0 ||
			(item.basis !== "team" && item.basis !== "group")
		)
			throw new Error(
				"Enter a name, positive amount, unit, and quantity basis for every added material.",
			);
		return { name, amount: item.amount, unit, basis: item.basis };
	});
}

function normalizeWasteItems(value: unknown): WasteItem[] {
	if (!Array.isArray(value)) throw new Error("Enter valid waste details.");
	return value.map((candidate) => {
		if (!candidate || typeof candidate !== "object")
			throw new Error("Enter valid waste details.");
		const item = candidate as Record<string, unknown>;
		const name = typeof item.name === "string" ? item.name.trim() : "";
		const container =
			typeof item.container === "string" ? item.container.trim() : "";
		const treatment =
			typeof item.treatment === "string" ? item.treatment.trim() : "";
		if (!name || !container || !treatment)
			throw new Error(
				"Enter a name, container, and treatment for every waste item.",
			);
		return { name, container, treatment };
	});
}

function stringArray(value: unknown, message: string): string[] {
	if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
		throw new Error(message);
	return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

function normalizeOptionalText(
	value: unknown,
	message: string,
	maximum: number,
): string | null {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value !== "string" || value.trim().length > maximum)
		throw new Error(message);
	return value.trim() || null;
}

function requireProfessor(actor: RequestActor): void {
	if (!actor.roles.includes("professor"))
		throw new Error("The professor role is required.");
}

function requireStaff(actor: RequestActor): void {
	if (!actor.roles.includes("staff") && !actor.roles.includes("admin"))
		throw new Error("Staff access is required.");
}

function requireAdmin(actor: RequestActor): void {
	if (!actor.roles.includes("admin"))
		throw new Error("The admin role is required.");
}

function isUuid(value: unknown): value is string {
	return (
		typeof value === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			value,
		)
	);
}
function isDate(value: unknown): value is string {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
		return false;
	const date = new Date(`${value}T12:00:00Z`);
	return (
		Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
	);
}
function calendarDaysBetween(from: string, to: string): number {
	return (
		(Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) /
		86_400_000
	);
}

function hermosilloDateTime(): { date: string; time: string } {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Hermosillo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date());
	const value = Object.fromEntries(
		parts.map((part) => [part.type, part.value]),
	);
	return {
		date: `${value.year}-${value.month}-${value.day}`,
		time: `${value.hour}:${value.minute}`,
	};
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
