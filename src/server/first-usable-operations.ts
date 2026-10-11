import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../db/schema.ts";
import { listAcademicPeriods } from "./academic-periods.ts";
import {
	activatePendingAccount,
	type SignUpInput,
	signUp,
} from "./accounts.ts";
import { type AuthUser, signIn as createSession } from "./auth.server.ts";
import { listActiveCatalogEntries } from "./catalogs.ts";
import {
	type RegisterGroupInput,
	registerProfessorGroup as registerGroup,
	updateProfessorGroup,
} from "./groups.ts";

export type FirstUsableDatabase = NodePgDatabase<typeof schema>;

export function createFirstUsableOperations(
	database: FirstUsableDatabase,
	getCurrentUser: () => Promise<AuthUser | null>,
) {
	return {
		signUp: (input: SignUpInput) => signUp(database, input),
		signIn: (input: { email: string; password: string }) =>
			createSession(database, input),
		activateAccount: async (userId: string) => {
			const actor = await requireRole(getCurrentUser, "admin");
			return activatePendingAccount(database, userId, actor);
		},
		getGroupOptions: async () => {
			await requireRole(getCurrentUser, "professor");
			const [periodOptions, labs, careers, subjects] = await Promise.all([
				listAcademicPeriods(database),
				listActiveCatalogEntries(database, "labs"),
				listActiveCatalogEntries(database, "careers"),
				listActiveCatalogEntries(database, "subjects"),
			]);
			return { ...periodOptions, labs, careers, subjects };
		},
		registerGroup: async (input: RegisterGroupInput) => {
			const actor = await requireRole(getCurrentUser, "professor");
			return registerGroup(database, actor, input);
		},
		updateGroup: async (groupId: string, input: RegisterGroupInput) => {
			const actor = await requireRole(getCurrentUser, "professor");
			return updateProfessorGroup(database, actor, groupId, input);
		},
	};
}

async function requireRole(
	getCurrentUser: () => Promise<AuthUser | null>,
	role: "professor" | "admin",
): Promise<AuthUser> {
	const user = await getCurrentUser();
	if (!user) throw new Error("An active session is required.");
	if (!user.roles.includes(role))
		throw new Error(`The ${role} role is required.`);
	return user;
}
