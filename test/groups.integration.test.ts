import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../src/db/schema.ts'
import { careers, groups, labs, periods, subjects, userRoles, users } from '../src/db/schema.ts'
import {
	deactivateProfessorGroup,
	getProfessorGroup,
	listProfessorGroups,
	reactivateProfessorGroup,
	registerProfessorGroup,
	updateProfessorGroup,
} from '../src/server/groups.ts'

const connectionString = process.env.DATABASE_URL_TEST
if (!connectionString) {
	throw new Error('Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.')
}
const pool = new Pool({ connectionString })
const database = drizzle(pool, { schema })

after(async () => {
	await pool.end()
})

async function fixture() {
	const suffix = randomUUID()
	const [professor] = await database.insert(users).values({
		email: `groups-${suffix}@example.test`,
		name: 'Group',
		surname: 'Professor',
		active: true,
	}).returning()
	assert.ok(professor)
	await database.insert(userRoles).values({ userId: professor.id, role: 'professor' })
	const periodCode = `2097-${suffix.slice(0, 8)}`
	await database.insert(periods).values({ code: periodCode })
	const [lab] = await database.insert(labs).values({ name: `Lab ${suffix}` }).returning()
	const [otherLab] = await database.insert(labs).values({ name: `Other Lab ${suffix}` }).returning()
	const [career] = await database.insert(careers).values({ name: `Career ${suffix}` }).returning()
	const [subject] = await database.insert(subjects).values({ name: `Subject ${suffix}` }).returning()
	assert.ok(lab && otherLab && career && subject)
	return {
		professor,
		actor: { id: professor.id, roles: ['professor'] as string[] },
		periodCode,
		lab,
		otherLab,
		career,
		subject,
		async clean() {
			await database.delete(groups).where(eq(groups.professorId, professor.id))
			await database.delete(userRoles).where(eq(userRoles.userId, professor.id))
			await database.delete(users).where(eq(users.id, professor.id))
			await database.delete(periods).where(eq(periods.code, periodCode))
			await database.delete(labs).where(inArray(labs.id, [lab.id, otherLab.id]))
			await database.delete(careers).where(eq(careers.id, career.id))
			await database.delete(subjects).where(eq(subjects.id, subject.id))
		},
	}
}

function groupInput(
	fixtureData: Awaited<ReturnType<typeof fixture>>,
	extra: Partial<Parameters<typeof registerProfessorGroup>[2]> = {},
) {
	return {
		periodCode: fixtureData.periodCode,
		labId: fixtureData.lab.id,
		careerId: fixtureData.career.id,
		subjectId: fixtureData.subject.id,
		students: 12,
		teams: 4,
		weekday: 1,
		startTime: '09:00',
		endTime: '10:00',
		...extra,
	}
}

test('professors can register with an automatic number and catalog label snapshots', async () => {
	const f = await fixture()
	try {
		const first = await registerProfessorGroup(database, f.actor, groupInput(f))
		assert.equal(first.number, 1)
		assert.equal(first.labName, f.lab.name)
		assert.equal(first.careerName, f.career.name)
		assert.equal(first.subjectName, f.subject.name)
		await database.update(labs).set({ name: `${f.lab.name} renamed` }).where(eq(labs.id, f.lab.id))
		const [saved] = await database.select().from(groups).where(eq(groups.id, first.id))
		assert.equal(saved?.labName, f.lab.name)
	} finally {
		await f.clean()
	}
})

test('manual numbers must be positive, remain reserved when inactive, and allocations are serialized', async () => {
	const f = await fixture()
	try {
		await assert.rejects(registerProfessorGroup(database, f.actor, groupInput(f, { number: 0 })), /positive/i)
		const manual = await registerProfessorGroup(database, f.actor, groupInput(f, { number: 4 }))
		await database.update(groups).set({ active: false }).where(eq(groups.id, manual.id))
		const allocated = await Promise.all([
			registerProfessorGroup(database, f.actor, groupInput(f)),
			registerProfessorGroup(database, f.actor, groupInput(f, { weekday: 2 })),
		])
		assert.deepEqual(allocated.map(({ number }) => number).sort((a, b) => a - b), [5, 6])
		await assert.rejects(
			registerProfessorGroup(database, f.actor, groupInput(f, { number: 4, weekday: 3 })),
			/already used/i,
		)
	} finally {
		await f.clean()
	}
})

test('registration validates counts, weekday, and ordered times', async () => {
	const f = await fixture()
	try {
		for (const input of [
			{ students: 0 },
			{ students: 61 },
			{ students: 3, teams: 4 },
			{ weekday: 7 },
			{ startTime: '10:00', endTime: '10:00' },
		]) {
			await assert.rejects(registerProfessorGroup(database, f.actor, groupInput(f, input)), /students|teams|weekday|end time/i)
		}
	} finally {
		await f.clean()
	}
})

test('overlapping active lab sessions conflict but adjacent, other lab, and other weekday sessions are allowed', async () => {
	const f = await fixture()
	const [otherProfessor] = await database.insert(users).values({
		email: `groups-conflict-${randomUUID()}@example.test`,
		name: 'Other',
		surname: 'Professor',
		active: true,
	}).returning()
	assert.ok(otherProfessor)
	await database.insert(userRoles).values({ userId: otherProfessor.id, role: 'professor' })
	try {
		await registerProfessorGroup(database, f.actor, groupInput(f))
		await assert.rejects(
			registerProfessorGroup(database, f.actor, groupInput(f, { startTime: '09:30', endTime: '10:30' })),
			/lab.*time|time.*lab|overlap/i,
		)
		await registerProfessorGroup(database, f.actor, groupInput(f, { startTime: '10:00', endTime: '11:00' }))
		await registerProfessorGroup(database, f.actor, groupInput(f, { labId: f.otherLab.id }))
		await registerProfessorGroup(database, f.actor, groupInput(f, { weekday: 2 }))
		const simultaneous = await Promise.allSettled([
			registerProfessorGroup(database, f.actor, groupInput(f, { startTime: '12:00', endTime: '13:00' })),
			registerProfessorGroup(
				database,
				{ id: otherProfessor.id, roles: ['professor'] },
				groupInput(f, { startTime: '12:30', endTime: '13:30' }),
			),
		])
		assert.equal(simultaneous.filter((result) => result.status === 'fulfilled').length, 1)
		assert.match(String((simultaneous.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason), /lab.*time|time.*lab|overlap/i)
	} finally {
		await database.delete(groups).where(eq(groups.professorId, otherProfessor.id))
		await database.delete(userRoles).where(eq(userRoles.userId, otherProfessor.id))
		await database.delete(users).where(eq(users.id, otherProfessor.id))
		await f.clean()
	}
})

test('only an active professor may register and retired catalog choices are rejected', async () => {
	const f = await fixture()
	try {
		await assert.rejects(registerProfessorGroup(database, { ...f.actor, roles: ['staff'] }, groupInput(f)), /professor/i)
		await database.update(labs).set({ active: false }).where(eq(labs.id, f.lab.id))
		await assert.rejects(registerProfessorGroup(database, f.actor, groupInput(f)), /active lab/i)
	} finally {
		await f.clean()
	}
})

test('professors can inspect, update, deactivate, and reactivate only their own groups', async () => {
	const f = await fixture()
	const other = await fixture()
	try {
		const group = await registerProfessorGroup(database, f.actor, groupInput(f))
		const otherGroup = await registerProfessorGroup(database, other.actor, groupInput(other))

		assert.deepEqual((await listProfessorGroups(database, f.actor)).map(({ id }) => id), [group.id])
		assert.equal((await getProfessorGroup(database, f.actor, group.id)).id, group.id)
		await assert.rejects(getProfessorGroup(database, f.actor, otherGroup.id), /not found/i)
		await assert.rejects(
			updateProfessorGroup(database, f.actor, otherGroup.id, groupInput(f, { students: 20 })),
			/not found/i,
		)
		await assert.rejects(deactivateProfessorGroup(database, f.actor, otherGroup.id), /not found/i)

		const updated = await updateProfessorGroup(
			database,
			f.actor,
			group.id,
			groupInput(f, { labId: f.otherLab.id, students: 20, teams: 5 }),
		)
		assert.equal(updated.number, group.number)
		assert.equal(updated.labName, f.otherLab.name)
		assert.equal(updated.students, 20)
		assert.equal(updated.active, true)

		const inactive = await deactivateProfessorGroup(database, f.actor, group.id)
		assert.equal(inactive.active, false)
		assert.equal(inactive.number, group.number)
		assert.equal((await listProfessorGroups(database, f.actor, false)).length, 0)
		assert.equal((await listProfessorGroups(database, f.actor, true))[0]?.id, group.id)

		const occupyingSlot = await registerProfessorGroup(
			database,
			other.actor,
			groupInput(f, { labId: f.otherLab.id }),
		)
		assert.ok(occupyingSlot)
		await assert.rejects(reactivateProfessorGroup(database, f.actor, group.id), /lab.*time|time.*lab|overlap/i)
		await deactivateProfessorGroup(database, other.actor, occupyingSlot.id)
		const reactivated = await reactivateProfessorGroup(database, f.actor, group.id)
		assert.equal(reactivated.active, true)
		assert.equal(reactivated.number, group.number)
		const secondOccupyingSlot = await registerProfessorGroup(
			database,
			other.actor,
			groupInput(f, {
				labId: f.otherLab.id,
				startTime: '11:00',
				endTime: '12:00',
			}),
		)
		assert.ok(secondOccupyingSlot)
		await assert.rejects(
			updateProfessorGroup(
				database,
				f.actor,
				group.id,
				groupInput(f, {
					labId: f.otherLab.id,
					startTime: '11:30',
					endTime: '12:30',
				}),
			),
			/lab.*time|time.*lab|overlap/i,
		)
	} finally {
		await other.clean()
		await f.clean()
	}
})

test('group updates keep numbers reserved and validate edits without replacing saved labels for retired catalog entries', async () => {
	const f = await fixture()
	try {
		const group = await registerProfessorGroup(database, f.actor, groupInput(f))
		await database.update(labs).set({ active: false, name: `${f.lab.name} retired` }).where(eq(labs.id, f.lab.id))
		const corrected = await updateProfessorGroup(database, f.actor, group.id, groupInput(f, { students: 16, teams: 4 }))
		assert.equal(corrected.labName, f.lab.name)
		assert.equal(corrected.students, 16)
		await assert.rejects(
			updateProfessorGroup(database, f.actor, group.id, groupInput(f, { students: 61 })),
			/students/i,
		)
		await deactivateProfessorGroup(database, f.actor, group.id)
		const next = await registerProfessorGroup(database, f.actor, groupInput(f, { labId: f.otherLab.id }))
		assert.equal(next.number, 2)
		await assert.rejects(
			updateProfessorGroup(database, f.actor, next.id, groupInput(f, { labId: f.otherLab.id, number: 1, weekday: 2 })),
			/already used/i,
		)
	} finally {
		await f.clean()
	}
})
