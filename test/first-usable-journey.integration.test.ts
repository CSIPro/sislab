import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema.ts";
import {
	careers,
	groups,
	labs,
	periods,
	sessions,
	subjects,
	userRoles,
	users,
} from "../src/db/schema.ts";
import { getSession, hashPassword } from "../src/server/auth.server.ts";
import { addCatalogEntry } from "../src/server/catalogs.ts";
import { saveAcademicPeriod } from "../src/server/academic-periods.ts";
import { createFirstUsableOperations } from "../src/server/first-usable-operations.ts";

const connectionString = process.env.DATABASE_URL_TEST;
if (!connectionString) {
	throw new Error("Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.");
}

const pool = new Pool({ connectionString });
const database = drizzle(pool, { schema });
const adminActor = { roles: ["admin"] };
const suffix = randomUUID();
const email = `journey-${suffix}@integration.test`;
const adminEmail = `journey-admin-${suffix}@integration.test`;
const periodYear = 2000 + (Number.parseInt(suffix.slice(0, 4), 16) % 201);
const periodCode = `${periodYear}-1`;
let adminId: string | undefined;
let professorId: string | undefined;
let currentToken: string | null = null;

const operations = createFirstUsableOperations(database, async () =>
	currentToken ? getSession(database, currentToken) : null,
);

after(async () => {
	if (adminId || professorId) {
		const ownerIds = [adminId, professorId].filter(
			(id): id is string => id !== undefined,
		);
		await database
			.delete(groups)
			.where(eq(groups.professorId, professorId ?? ""));
		await database.delete(sessions).where(eq(sessions.userId, adminId ?? ""));
		await database.delete(sessions).where(eq(sessions.userId, professorId ?? ""));
		for (const userId of ownerIds) {
			await database.delete(userRoles).where(eq(userRoles.userId, userId));
			await database.delete(users).where(eq(users.id, userId));
		}
	}
	await database.delete(periods).where(eq(periods.code, periodCode));
	await database.delete(labs).where(eq(labs.name, `Journey Lab ${suffix}`));
	await database
		.delete(careers)
		.where(eq(careers.name, `Journey Career ${suffix}`));
	await database
		.delete(subjects)
		.where(eq(subjects.name, `Journey Subject ${suffix}`));
	await pool.end();
});

test("professor completes signup, activation, login, group registration, and correction", async () => {
	const [admin] = await database
		.insert(users)
		.values({
			email: adminEmail,
			name: "Journey",
			surname: "Admin",
			passwordHash: await hashPassword("a supplied journey admin password"),
			active: true,
		})
		.returning();
	assert.ok(admin);
	adminId = admin.id;
	await database.insert(userRoles).values({ userId: admin.id, role: "admin" });

	const pending = await operations.signUp({
		email,
		name: "Journey",
		surname: "Professor",
		password: "a supplied journey professor password",
	});
	professorId = pending.id;
	assert.equal(pending.active, false);
	assert.equal(
		await operations.signIn({
			email,
			password: "a supplied journey professor password",
		}),
		null,
	);

	const adminSession = await operations.signIn({
		email: adminEmail,
		password: "a supplied journey admin password",
	});
	assert.ok(adminSession);
	currentToken = adminSession.token;
	await assert.rejects(operations.getGroupOptions(), /professor/i);
	const activated = await operations.activateAccount(pending.id);
	assert.equal(activated.active, true);

	await saveAcademicPeriod(database, { code: periodCode });
	const lab = await addCatalogEntry(
		database,
		"labs",
		`Journey Lab ${suffix}`,
		adminActor,
	);
	const career = await addCatalogEntry(
		database,
		"careers",
		`Journey Career ${suffix}`,
		adminActor,
	);
	const subject = await addCatalogEntry(
		database,
		"subjects",
		`Journey Subject ${suffix}`,
		adminActor,
	);

	const professorSession = await operations.signIn({
		email,
		password: "a supplied journey professor password",
	});
	assert.ok(professorSession);
	currentToken = professorSession.token;
	const options = await operations.getGroupOptions();
	assert.ok(options.periods.some(({ code }) => code === periodCode));
	assert.ok(options.labs.some(({ id }) => id === lab.id));
	assert.ok(options.careers.some(({ id }) => id === career.id));
	assert.ok(options.subjects.some(({ id }) => id === subject.id));

	const created = await operations.registerGroup({
		periodCode,
		labId: lab.id,
		careerId: career.id,
		subjectId: subject.id,
		students: 12,
		teams: 4,
		weekday: 2,
		startTime: "09:00",
		endTime: "10:00",
	});
	assert.equal(created.number, 1);
	assert.equal(created.labName, lab.name);
	const corrected = await operations.updateGroup(created.id, {
		periodCode,
		number: created.number,
		labId: lab.id,
		careerId: career.id,
		subjectId: subject.id,
		students: 16,
		teams: 4,
		weekday: 2,
		startTime: "10:00",
		endTime: "11:00",
	});
	assert.equal(corrected.students, 16);
	assert.equal(corrected.startTime, "10:00:00");

	const [persisted] = await database
		.select()
		.from(groups)
		.where(eq(groups.id, created.id));
	assert.equal(persisted?.students, 16);
	assert.equal(persisted?.endTime, "11:00:00");
});
