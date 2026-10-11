import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema.ts";
import { labExercises } from "../db/schema.ts";
import { listActiveLabExercises, listLabExercises } from "./lab-exercises.ts";

const connectionString = process.env.DATABASE_URL_TEST;
if (!connectionString) {
	throw new Error(
		"Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.",
	);
}
const pool = new Pool({ connectionString });
const database = drizzle(pool, { schema });
const admin = { roles: ["admin"] };

after(async () => {
	await pool.end();
});

test("lab exercises list in numeric order of their labels", async () => {
	// The test database is shared, so the test only reads back its own rows.
	const suffix = randomUUID();
	const name = `Exercise ${suffix}`;
	const materials = { reagents: [], equipment: [], waste: [] };
	await database.insert(labExercises).values(
		["Anexo", "11", "10B", "2", "10", "0", "3B", "1", "3"].map((number) => ({
			number,
			name,
			materials,
		})),
	);

	try {
		const expected = ["0", "1", "2", "3", "3B", "10", "10B", "11", "Anexo"];
		const all = await listLabExercises(database, admin);
		assert.deepEqual(
			all.filter((exercise) => exercise.name === name).map((e) => e.number),
			expected,
		);
		const active = await listActiveLabExercises(database);
		assert.deepEqual(
			active.filter((exercise) => exercise.name === name).map((e) => e.number),
			expected,
		);
	} finally {
		await database
			.delete(labExercises)
			.where(like(labExercises.name, `%${suffix}`));
	}
});
