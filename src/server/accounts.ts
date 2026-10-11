import { and, asc, eq } from "drizzle-orm";
import { userRoles, users } from "../db/schema.ts";
import type { AuthDatabase, AuthUser } from "./auth.server.ts";
import {
	hashPassword,
	normalizeEmail,
	validatePassword,
} from "./auth.server.ts";

export type AccountActor = Pick<AuthUser, "roles">;
export type PendingAccount = {
	id: string;
	email: string;
	name: string;
	surname: string;
	active: boolean;
	roles: ["professor"];
};

export type SignUpInput = {
	email: string;
	name: string;
	surname: string;
	password: string;
};

export async function signUp(
	database: AuthDatabase,
	input: SignUpInput,
): Promise<PendingAccount> {
	const email = normalizeEmail(input.email);
	validatePassword(input.password);
	const name = input.name.trim();
	const surname = input.surname.trim();
	if (!name || !surname) throw new Error("Enter your first and last name.");
	const passwordHash = await hashPassword(input.password);

	try {
		return await database.transaction(async (transaction) => {
			const [user] = await transaction
				.insert(users)
				.values({ email, name, surname, passwordHash, active: false })
				.returning({
					id: users.id,
					email: users.email,
					name: users.name,
					surname: users.surname,
					active: users.active,
				});
			if (!user) throw new Error("Could not create the account.");
			await transaction
				.insert(userRoles)
				.values({ userId: user.id, role: "professor" });
			return { ...user, roles: ["professor"] };
		});
	} catch (error) {
		if (isUniqueViolation(error))
			throw new Error("An account already uses this email.");
		throw error;
	}
}

export async function listPendingAccounts(
	database: AuthDatabase,
	actor: AccountActor,
): Promise<PendingAccount[]> {
	requireAdmin(actor);
	const rows = await database
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			surname: users.surname,
			active: users.active,
		})
		.from(users)
		.innerJoin(userRoles, eq(userRoles.userId, users.id))
		.where(and(eq(users.active, false), eq(userRoles.role, "professor")))
		.orderBy(asc(users.createdAt));
	return rows.map((user) => ({ ...user, roles: ["professor"] }));
}

export async function activatePendingAccount(
	database: AuthDatabase,
	userId: string,
	actor: AccountActor,
): Promise<PendingAccount> {
	requireAdmin(actor);
	const [user] = await database
		.update(users)
		.set({ active: true })
		.from(userRoles)
		.where(
			and(
				eq(users.id, userId),
				eq(userRoles.userId, users.id),
				eq(userRoles.role, "professor"),
				eq(users.active, false),
			),
		)
		.returning({
			id: users.id,
			email: users.email,
			name: users.name,
			surname: users.surname,
			active: users.active,
		});
	if (!user) throw new Error("Pending professor account not found.");
	return { ...user, roles: ["professor"] };
}

function requireAdmin(actor: AccountActor): void {
	if (!actor.roles.includes("admin"))
		throw new Error("Admin access is required.");
}

function isUniqueViolation(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	if ("code" in error && error.code === "23505") return true;
	return "cause" in error && isUniqueViolation(error.cause);
}
