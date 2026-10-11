import { and, asc, eq, sql } from "drizzle-orm";
import { sessions, userRoles, users } from "../db/schema.ts";
import type { AuthDatabase, AuthUser } from "./auth.server.ts";
import { hashPassword, hasRole, validatePassword } from "./auth.server.ts";

const USER_ACCESS_LOCK_ID = 731_042_002;
const validRoles = ["professor", "staff", "admin"] as const;

export type UserRole = (typeof validRoles)[number];
export type UserAccessActor = Pick<AuthUser, "roles">;
type AuthTransaction = Parameters<
	Parameters<AuthDatabase["transaction"]>[0]
>[0];
export type ManagedUser = {
	id: string;
	email: string;
	name: string;
	surname: string;
	active: boolean;
	roles: UserRole[];
};

export async function listUsers(
	database: AuthDatabase,
	actor: UserAccessActor,
): Promise<ManagedUser[]> {
	requireAdmin(actor);
	const rows = await database
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			surname: users.surname,
			active: users.active,
			role: userRoles.role,
			createdAt: users.createdAt,
		})
		.from(users)
		.leftJoin(userRoles, eq(userRoles.userId, users.id))
		.orderBy(asc(users.createdAt), asc(users.email));

	const managed = new Map<string, ManagedUser>();
	for (const row of rows) {
		let user = managed.get(row.id);
		if (!user) {
			user = {
				id: row.id,
				email: row.email,
				name: row.name,
				surname: row.surname,
				active: row.active,
				roles: [],
			};
			managed.set(row.id, user);
		}
		if (row.role) user.roles.push(row.role);
	}
	return [...managed.values()];
}

export async function setUserRoles(
	database: AuthDatabase,
	userId: string,
	roles: UserRole[],
	actor: UserAccessActor,
): Promise<ManagedUser> {
	requireAdmin(actor);
	const normalizedRoles = normalizeRoles(roles);
	return database.transaction(async (transaction) => {
		await lockUserAccess(transaction);
		const [target] = await transaction
			.select({ id: users.id, active: users.active })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		if (!target) throw new Error("User not found.");

		const [currentAdminRole] = await transaction
			.select({ role: userRoles.role })
			.from(userRoles)
			.where(and(eq(userRoles.userId, userId), eq(userRoles.role, "admin")))
			.limit(1);
		if (
			target.active &&
			currentAdminRole &&
			!normalizedRoles.includes("admin")
		) {
			await ensureAnotherActiveAdmin(transaction, userId);
		}

		await transaction.delete(userRoles).where(eq(userRoles.userId, userId));
		if (normalizedRoles.length > 0) {
			await transaction
				.insert(userRoles)
				.values(normalizedRoles.map((role) => ({ userId, role })));
		}
		return getManagedUser(transaction, userId);
	});
}

export async function setUserActive(
	database: AuthDatabase,
	userId: string,
	active: boolean,
	actor: UserAccessActor,
): Promise<ManagedUser> {
	requireAdmin(actor);
	return database.transaction(async (transaction) => {
		await lockUserAccess(transaction);
		const [target] = await transaction
			.select({ id: users.id, active: users.active })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		if (!target) throw new Error("User not found.");

		if (!active && target.active) {
			const [adminRole] = await transaction
				.select({ role: userRoles.role })
				.from(userRoles)
				.where(and(eq(userRoles.userId, userId), eq(userRoles.role, "admin")))
				.limit(1);
			if (adminRole) await ensureAnotherActiveAdmin(transaction, userId);
		}

		await transaction.update(users).set({ active }).where(eq(users.id, userId));
		if (!active)
			await transaction.delete(sessions).where(eq(sessions.userId, userId));
		return getManagedUser(transaction, userId);
	});
}

export async function replaceUserPassword(
	database: AuthDatabase,
	userId: string,
	password: string,
	actor: UserAccessActor,
): Promise<void> {
	requireAdmin(actor);
	validatePassword(password);
	const passwordHash = await hashPassword(password);
	await database.transaction(async (transaction) => {
		const [updated] = await transaction
			.update(users)
			.set({ passwordHash })
			.where(eq(users.id, userId))
			.returning({ id: users.id });
		if (!updated) throw new Error("User not found.");
		await transaction.delete(sessions).where(eq(sessions.userId, userId));
	});
}

function normalizeRoles(roles: UserRole[]): UserRole[] {
	if (
		!Array.isArray(roles) ||
		roles.some((role) => !validRoles.includes(role))
	) {
		throw new Error("Choose valid user roles.");
	}
	return [...new Set(roles)];
}

function requireAdmin(actor: UserAccessActor): void {
	if (!hasRole(actor.roles, "admin")) {
		throw new Error("Admin access is required.");
	}
}

async function lockUserAccess(transaction: AuthTransaction) {
	await transaction.execute(
		sql`SELECT pg_advisory_xact_lock(${USER_ACCESS_LOCK_ID})`,
	);
}

async function ensureAnotherActiveAdmin(
	transaction: AuthTransaction,
	excludedUserId: string,
): Promise<void> {
	const [result] = await transaction
		.select({ count: sql<number>`count(*)::int` })
		.from(users)
		.innerJoin(userRoles, eq(userRoles.userId, users.id))
		.where(
			and(
				eq(users.active, true),
				eq(userRoles.role, "admin"),
				sql`${users.id} <> ${excludedUserId}`,
			),
		);
	if (!result || result.count === 0)
		throw new Error("Cannot lock out the last active admin.");
}

async function getManagedUser(
	database: AuthTransaction,
	userId: string,
): Promise<ManagedUser> {
	const [user] = await database
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			surname: users.surname,
			active: users.active,
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	if (!user) throw new Error("User not found.");
	const roles = await database
		.select({ role: userRoles.role })
		.from(userRoles)
		.where(eq(userRoles.userId, userId));
	return { ...user, roles: roles.map(({ role }) => role) };
}
