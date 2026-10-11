import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../db/schema.ts";
import { settings } from "../db/schema.ts";

export type SettingsDatabase = NodePgDatabase<typeof schema>;

const DEFAULT_MIN_NOTICE_DAYS = 7;
const MAX_MIN_NOTICE_DAYS = 2_147_483_647;

export async function getMinimumNoticeDays(
	database: SettingsDatabase,
): Promise<number> {
	const [setting] = await database
		.select({ minNoticeDays: settings.minNoticeDays })
		.from(settings)
		.where(eq(settings.id, 1))
		.limit(1);
	return setting?.minNoticeDays ?? DEFAULT_MIN_NOTICE_DAYS;
}

export async function saveMinimumNoticeDays(
	database: SettingsDatabase,
	minNoticeDays: number,
): Promise<number> {
	if (
		!Number.isSafeInteger(minNoticeDays) ||
		minNoticeDays < 0 ||
		minNoticeDays > MAX_MIN_NOTICE_DAYS
	) {
		throw new Error("Ingresa un número entero de días igual o mayor que cero.");
	}

	const [setting] = await database
		.insert(settings)
		.values({ id: 1, minNoticeDays })
		.onConflictDoUpdate({
			target: settings.id,
			set: { minNoticeDays },
		})
		.returning({ minNoticeDays: settings.minNoticeDays });
	if (!setting) throw new Error("No se pudo guardar el aviso mínimo.");
	return setting.minNoticeDays;
}
