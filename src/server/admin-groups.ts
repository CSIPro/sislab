import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../db/schema.ts";
import { groups, users } from "../db/schema.ts";
import { byPeriodCode } from "./academic-periods.ts";
import type { GroupActor, RegisterGroupInput } from "./groups.ts";
import {
	deactivateProfessorGroup,
	getProfessorGroup,
	reactivateProfessorGroup,
	updateProfessorGroup,
} from "./groups.ts";

type GroupDatabase = NodePgDatabase<typeof schema>;
export type AdminGroupActor = GroupActor;
export type AdminGroupRow = {
	group: typeof groups.$inferSelect;
	professor: { id: string; name: string; surname: string; email: string };
};

export async function listAllGroups(
	database: GroupDatabase,
	actor: AdminGroupActor,
	includeInactive = true,
): Promise<AdminGroupRow[]> {
	requireAdmin(actor);
	return database
		.select({
			group: groups,
			professor: {
				id: users.id,
				name: users.name,
				surname: users.surname,
				email: users.email,
			},
		})
		.from(groups)
		.innerJoin(users, eq(users.id, groups.professorId))
		.where(includeInactive ? undefined : eq(groups.active, true))
		.orderBy(...byPeriodCode(groups.periodCode), groups.number);
}

export async function getAnyGroup(
	database: GroupDatabase,
	actor: AdminGroupActor,
	groupId: string,
): Promise<AdminGroupRow> {
	requireAdmin(actor);
	const [row] = await database
		.select({
			group: groups,
			professor: {
				id: users.id,
				name: users.name,
				surname: users.surname,
				email: users.email,
			},
		})
		.from(groups)
		.innerJoin(users, eq(users.id, groups.professorId))
		.where(eq(groups.id, groupId))
		.limit(1);
	if (!row) throw new Error("That group was not found.");
	const group = await getProfessorGroup(
		database,
		{ id: row.group.professorId, roles: ["professor"] },
		groupId,
	);
	return { ...row, group };
}

export async function updateAnyGroup(
	database: GroupDatabase,
	actor: AdminGroupActor,
	groupId: string,
	input: RegisterGroupInput,
): Promise<typeof groups.$inferSelect> {
	requireAdmin(actor);
	return updateProfessorGroup(
		database,
		await groupOwnerActor(database, groupId),
		groupId,
		input,
	);
}

export async function deactivateAnyGroup(
	database: GroupDatabase,
	actor: AdminGroupActor,
	groupId: string,
): Promise<typeof groups.$inferSelect> {
	requireAdmin(actor);
	return deactivateProfessorGroup(
		database,
		await groupOwnerActor(database, groupId),
		groupId,
	);
}

export async function reactivateAnyGroup(
	database: GroupDatabase,
	actor: AdminGroupActor,
	groupId: string,
): Promise<typeof groups.$inferSelect> {
	requireAdmin(actor);
	return reactivateProfessorGroup(
		database,
		await groupOwnerActor(database, groupId),
		groupId,
	);
}

async function groupOwnerActor(
	database: GroupDatabase,
	groupId: string,
): Promise<GroupActor> {
	const [group] = await database
		.select({ professorId: groups.professorId })
		.from(groups)
		.where(eq(groups.id, groupId))
		.limit(1);
	if (!group) throw new Error("That group was not found.");
	return { id: group.professorId, roles: ["professor"] };
}

function requireAdmin(actor: AdminGroupActor): void {
	if (!actor.roles.includes("admin"))
		throw new Error("Admin access is required to manage groups.");
}
