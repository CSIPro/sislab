import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../db/schema.ts";
import { academicPeriodStatus } from "../lib/academic-period.ts";
import { sislabToday } from "../lib/session-dates.ts";
import { listAcademicPeriods } from "./academic-periods.ts";
import {
	type AccountRole,
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
		activateAccount: async (userId: string, roles?: AccountRole[]) => {
			const actor = await requireRole(getCurrentUser, "admin");
			return activatePendingAccount(database, userId, actor, roles);
		},
		getGroupOptions: async () => {
			await requireRole(getCurrentUser, "professor");
			const [periodOptions, labs, careers, subjects] = await Promise.all([
				listAcademicPeriods(database),
				listActiveCatalogEntries(database, "labs"),
				listActiveCatalogEntries(database, "careers"),
				listActiveCatalogEntries(database, "subjects"),
			]);
			// A professor cannot register groups in a concluded period (ADR 0009).
			const today = sislabToday();
			const periods = periodOptions.periods.filter(
				(period) => academicPeriodStatus(period, today) !== "concluded",
			);
			return { ...periodOptions, periods, labs, careers, subjects };
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
