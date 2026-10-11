import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema.ts";
import {
	careers,
	groups,
	labExercises,
	labs,
	periods,
	preparationRequests,
	subjects,
	userRoles,
	users,
} from "../db/schema.ts";
import { listRequestDates } from "./preparation-requests.ts";

const connectionString = process.env.DATABASE_URL_TEST;
if (!connectionString) {
	throw new Error(
		"Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.",
	);
}
const pool = new Pool({ connectionString });
const database = drizzle(pool, { schema });
const staff = { id: randomUUID(), roles: ["staff"] };

after(async () => {
	await pool.end();
});

async function fixture() {
	const suffix = randomUUID();
	// The test database is shared, so each run works in a year of its own.
	const year = 2200 + (Number.parseInt(suffix.slice(0, 4), 16) % 700);
	const [professor] = await database
		.insert(users)
		.values({
			email: `request-dates-${suffix}@example.test`,
			name: "Request",
			surname: "Professor",
			active: true,
		})
		.returning();
	assert.ok(professor);
	await database
		.insert(userRoles)
		.values({ userId: professor.id, role: "professor" });
	const periodCode = `${year}-${suffix.slice(0, 8)}`;
	await database.insert(periods).values({ code: periodCode });
	const [lab] = await database
		.insert(labs)
		.values({ name: `Lab ${suffix}` })
		.returning();
	const [career] = await database
		.insert(careers)
		.values({ name: `Career ${suffix}` })
		.returning();
	const [subject] = await database
		.insert(subjects)
		.values({ name: `Subject ${suffix}` })
		.returning();
	const [exercise] = await database
		.insert(labExercises)
		.values({
			number: "1",
			name: `Exercise ${suffix}`,
			materials: { reagents: [], equipment: [], waste: [] },
		})
		.returning();
	assert.ok(lab && career && subject && exercise);
	const groupIds: string[] = [];
	async function addGroup() {
		const [group] = await database
			.insert(groups)
			.values({
				professorId: professor.id,
				periodCode,
				number: groupIds.length + 1,
				labId: lab.id,
				labName: lab.name,
				careerId: career.id,
				careerName: career.name,
				subjectId: subject.id,
				subjectName: subject.name,
				students: 20,
				teams: 5,
				weekday: groupIds.length,
				startTime: "08:00",
				endTime: "10:00",
			})
			.returning();
		assert.ok(group);
		groupIds.push(group.id);
		return group.id;
	}
	const firstGroup = await addGroup();
	return {
		professor,
		day: (monthDay: string) => `${year}-${monthDay}`,
		addGroup,
		async addRequest(
			monthDay: string,
			fields: Partial<typeof preparationRequests.$inferInsert> = {},
		) {
			await database.insert(preparationRequests).values({
				groupId: firstGroup,
				professorId: professor.id,
				exerciseId: exercise.id,
				exerciseNumber: exercise.number,
				exerciseName: exercise.name,
				sessionDate: `${year}-${monthDay}`,
				labId: lab.id,
				labName: lab.name,
				startTime: "08:00",
				endTime: "10:00",
				materials: {
					reagents: [],
					equipment: [],
					waste: [],
					omittedReagents: [],
					addedReagents: [],
					addedEquipment: [],
					addedWaste: [],
				},
				...fields,
			});
		},
		async clean() {
			await database
				.delete(preparationRequests)
				.where(eq(preparationRequests.professorId, professor.id));
			await database.delete(groups).where(eq(groups.professorId, professor.id));
			await database
				.delete(labExercises)
				.where(eq(labExercises.id, exercise.id));
			await database
				.delete(userRoles)
				.where(eq(userRoles.userId, professor.id));
			await database.delete(users).where(eq(users.id, professor.id));
			await database.delete(periods).where(eq(periods.code, periodCode));
			await database.delete(labs).where(eq(labs.id, lab.id));
			await database.delete(careers).where(eq(careers.id, career.id));
			await database.delete(subjects).where(eq(subjects.id, subject.id));
		},
	};
}

test("lists each date in the range that has a request, once and in order", async () => {
	const data = await fixture();
	try {
		const secondGroup = await data.addGroup();
		await data.addRequest("03-20");
		await data.addRequest("03-05");
		await data.addRequest("03-05", { groupId: secondGroup });
		await data.addRequest("02-28");
		await data.addRequest("04-01");
		assert.deepEqual(
			await listRequestDates(
				database,
				staff,
				data.day("03-01"),
				data.day("03-31"),
			),
			[data.day("03-05"), data.day("03-20")],
		);
	} finally {
		await data.clean();
	}
});

test("leaves out a date whose requests are all voided or declined", async () => {
	const data = await fixture();
	try {
		const by = data.professor.id;
		const late = { lateReason: "Cambio de horario" };
		await data.addRequest("03-03", {
			status: "voided",
			voidReason: "Duplicada",
			voidedBy: by,
			voidedAt: new Date(),
		});
		await data.addRequest("03-04", {
			...late,
			lateDeclinedBy: by,
			lateDeclinedAt: new Date(),
		});
		await data.addRequest("03-05", late);
		await data.addRequest("03-06", {
			...late,
			lateAcceptedBy: by,
			lateAcceptedAt: new Date(),
		});
		assert.deepEqual(
			await listRequestDates(
				database,
				staff,
				data.day("03-01"),
				data.day("03-31"),
			),
			[data.day("03-05"), data.day("03-06")],
		);
	} finally {
		await data.clean();
	}
});

test("only staff and admins can list the request dates", async () => {
	await assert.rejects(
		listRequestDates(
			database,
			{ id: randomUUID(), roles: ["professor"] },
			"2026-03-01",
			"2026-03-31",
		),
		/Staff access is required/,
	);
});
