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
import {
	countRemainingRequestsToday,
	getPreparationRequestReport,
	listRequestDates,
} from "./preparation-requests.ts";

const connectionString = process.env.DATABASE_URL_TEST;
if (!connectionString) {
	throw new Error(
		"Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.",
	);
}
const pool = new Pool({ connectionString });
const database = drizzle(pool, { schema });
const staff = { id: randomUUID(), roles: ["staff"] };
const admin = { id: randomUUID(), roles: ["admin"] };

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
	const extraPeriodCodes: string[] = [];
	return {
		periodCode,
		year,
		/** Another period of this run, with one group in it. */
		async addPeriod(dates?: { startsOn: string; endsOn: string }) {
			const code = `${year}-${randomUUID().slice(0, 8)}`;
			await database.insert(periods).values({ code, ...dates });
			extraPeriodCodes.push(code);
			const [group] = await database
				.insert(groups)
				.values({
					professorId: professor.id,
					periodCode: code,
					number: 1,
					labId: lab.id,
					labName: lab.name,
					careerId: career.id,
					careerName: career.name,
					subjectId: subject.id,
					subjectName: subject.name,
					students: 20,
					teams: 5,
					weekday: 1,
					startTime: "08:00",
					endTime: "10:00",
				})
				.returning();
			assert.ok(group);
			return { periodCode: code, groupId: group.id };
		},
		professor,
		day: (monthDay: string) => `${year}-${monthDay}`,
		/** An instant on that day at that wall-clock time in Hermosillo, which is UTC-7 all year. */
		at: (monthDay: string, time: string) =>
			new Date(`${year}-${monthDay}T${time}:00-07:00`),
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
			for (const code of extraPeriodCodes)
				await database.delete(periods).where(eq(periods.code, code));
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

test("counts today's requests whose session has not ended", async () => {
	const data = await fixture();
	try {
		const [second, third] = [await data.addGroup(), await data.addGroup()];
		await data.addRequest("03-05", { startTime: "08:00", endTime: "10:00" });
		await data.addRequest("03-05", {
			groupId: second,
			startTime: "10:00",
			endTime: "12:00",
		});
		await data.addRequest("03-05", {
			groupId: third,
			startTime: "13:00",
			endTime: "15:00",
		});
		await data.addRequest("03-04", { startTime: "13:00", endTime: "15:00" });
		await data.addRequest("03-06", { startTime: "13:00", endTime: "15:00" });
		assert.equal(
			await countRemainingRequestsToday(
				database,
				staff,
				data.at("03-05", "10:30"),
			),
			2,
		);
	} finally {
		await data.clean();
	}
});

test("leaves voided requests and declined exceptions out of the remaining count", async () => {
	const data = await fixture();
	try {
		const by = data.professor.id;
		const late = { lateReason: "Cambio de horario" };
		const [declined, pending, accepted] = [
			await data.addGroup(),
			await data.addGroup(),
			await data.addGroup(),
		];
		await data.addRequest("03-05", {
			status: "voided",
			voidReason: "Duplicada",
			voidedBy: by,
			voidedAt: new Date(),
		});
		await data.addRequest("03-05", {
			...late,
			groupId: declined,
			lateDeclinedBy: by,
			lateDeclinedAt: new Date(),
		});
		await data.addRequest("03-05", { ...late, groupId: pending });
		await data.addRequest("03-05", {
			...late,
			groupId: accepted,
			lateAcceptedBy: by,
			lateAcceptedAt: new Date(),
		});
		assert.equal(
			await countRemainingRequestsToday(
				database,
				staff,
				data.at("03-05", "07:00"),
			),
			2,
		);
	} finally {
		await data.clean();
	}
});

test("only staff and admins can count the remaining requests", async () => {
	await assert.rejects(
		countRemainingRequestsToday(database, {
			id: randomUUID(),
			roles: ["professor"],
		}),
		/Staff access is required/,
	);
});

const voided = (by: string) => ({
	status: "voided" as const,
	voidReason: "Duplicada",
	voidedBy: by,
	voidedAt: new Date(),
});

test("the report counts a request toward its group's period, whatever its session date", async () => {
	const data = await fixture();
	try {
		// The period ends in March, but the request is for a date in May.
		const dated = await data.addPeriod({
			startsOn: data.day("01-10"),
			endsOn: data.day("03-31"),
		});
		await data.addRequest("05-12", { groupId: dated.groupId });
		await data.addRequest("02-10");
		const report = await getPreparationRequestReport(database, admin, [
			dated.periodCode,
		]);
		assert.deepEqual(
			report.rows.map(({ request }) => request.sessionDate),
			[data.day("05-12")],
		);
		assert.equal(report.totals.total, 1);
	} finally {
		await data.clean();
	}
});

test("the report tags each row with its period and lists the newest first", async () => {
	const data = await fixture();
	try {
		const other = await data.addPeriod();
		await data.addRequest("03-02");
		await data.addRequest("03-09", { groupId: other.groupId });
		await data.addRequest("03-09", {
			groupId: await data.addGroup(),
			startTime: "12:00",
			endTime: "14:00",
		});
		const report = await getPreparationRequestReport(database, admin, [
			data.periodCode,
			other.periodCode,
		]);
		assert.deepEqual(
			report.rows.map(({ request, group }) => [
				group.periodCode,
				request.sessionDate,
				request.startTime,
			]),
			[
				[data.periodCode, data.day("03-09"), "12:00:00"],
				[other.periodCode, data.day("03-09"), "08:00:00"],
				[data.periodCode, data.day("03-02"), "08:00:00"],
			],
		);
		assert.deepEqual(report.rows[0]?.professor.name, "Request");
	} finally {
		await data.clean();
	}
});

test("the report totals count every request, including voided ones and declined exceptions", async () => {
	const data = await fixture();
	try {
		const by = data.professor.id;
		const late = { lateReason: "Cambio de horario" };
		const [a, b, c, d, e] = [
			await data.addGroup(),
			await data.addGroup(),
			await data.addGroup(),
			await data.addGroup(),
			await data.addGroup(),
		];
		await data.addRequest("03-02");
		await data.addRequest("03-02", { groupId: a, ...voided(by) });
		await data.addRequest("03-03", {
			groupId: b,
			...late,
			lateDeclinedBy: by,
			lateDeclinedAt: new Date(),
		});
		await data.addRequest("03-03", {
			groupId: c,
			...late,
			lateAcceptedBy: by,
			lateAcceptedAt: new Date(),
		});
		await data.addRequest("03-04", { groupId: d, ...late });
		await data.addRequest("03-04", { groupId: e, labName: "Otro laboratorio" });
		const report = await getPreparationRequestReport(database, admin, [
			data.periodCode,
		]);
		assert.equal(report.rows.length, 6);
		assert.deepEqual(
			{
				total: report.totals.total,
				acceptedLate: report.totals.acceptedLate,
				declinedLate: report.totals.declinedLate,
				voided: report.totals.voided,
			},
			{ total: 6, acceptedLate: 1, declinedLate: 1, voided: 1 },
		);
		assert.deepEqual(
			[...report.totals.byLab].sort((x, y) => y.count - x.count),
			[
				{
					labName: report.rows.find(
						({ request }) => request.labName !== "Otro laboratorio",
					)?.request.labName,
					count: 5,
				},
				{ labName: "Otro laboratorio", count: 1 },
			],
		);
	} finally {
		await data.clean();
	}
});

test("the report's ticket days leave out days with only voided or unaccepted late requests", async () => {
	const data = await fixture();
	try {
		const by = data.professor.id;
		const late = { lateReason: "Cambio de horario" };
		const other = await data.addPeriod();
		const [a, b] = [await data.addGroup(), await data.addGroup()];
		await data.addRequest("03-02");
		await data.addRequest("03-03", voided(by));
		await data.addRequest("03-04", { ...late });
		await data.addRequest("03-04", {
			groupId: a,
			...late,
			lateDeclinedBy: by,
			lateDeclinedAt: new Date(),
		});
		await data.addRequest("03-05", {
			groupId: b,
			...late,
			lateAcceptedBy: by,
			lateAcceptedAt: new Date(),
		});
		await data.addRequest("03-06", { groupId: other.groupId });
		const report = await getPreparationRequestReport(database, admin, [
			data.periodCode,
			other.periodCode,
		]);
		assert.deepEqual(report.ticketDays, {
			[data.periodCode]: [data.day("03-02"), data.day("03-05")],
			[other.periodCode]: [data.day("03-06")],
		});
	} finally {
		await data.clean();
	}
});

test("a period with no requests has empty rows, totals and ticket days", async () => {
	const data = await fixture();
	try {
		const report = await getPreparationRequestReport(database, admin, [
			data.periodCode,
		]);
		assert.deepEqual(report.rows, []);
		assert.equal(report.totals.total, 0);
		assert.deepEqual(report.totals.byLab, []);
		assert.deepEqual(report.ticketDays, { [data.periodCode]: [] });
	} finally {
		await data.clean();
	}
});

test("only admins can read the report", async () => {
	for (const roles of [["staff"], ["professor"], ["staff", "professor"]]) {
		await assert.rejects(
			getPreparationRequestReport(database, { id: randomUUID(), roles }, [
				"2026-1",
			]),
			/The admin role is required/,
		);
	}
});
