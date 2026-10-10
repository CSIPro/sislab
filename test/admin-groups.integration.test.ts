import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../src/db/schema.ts'
import { careers, groups, labs, periods, subjects, userRoles, users } from '../src/db/schema.ts'
import {
	deactivateAnyGroup,
	getAnyGroup,
	listAllGroups,
	reactivateAnyGroup,
	updateAnyGroup,
} from '../src/server/admin-groups.ts'
import {
	deactivateProfessorGroup,
	listProfessorGroups,
	registerProfessorGroup,
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
	const [admin] = await database.insert(users).values({
		email: `admin-groups-${suffix}@example.test`,
		name: 'Admin',
		surname: 'Groups',
		active: true,
	}).returning()
	const [professor] = await database.insert(users).values({
		email: `professor-groups-${suffix}@example.test`,
		name: 'Target',
		surname: 'Professor',
		active: true,
	}).returning()
	const [staff] = await database.insert(users).values({
		email: `staff-groups-${suffix}@example.test`,
		name: 'Staff',
		surname: 'Only',
		active: true,
	}).returning()
	assert.ok(admin && professor && staff)
	await database.insert(userRoles).values([
		{ userId: admin.id, role: 'admin' },
		{ userId: admin.id, role: 'professor' },
		{ userId: professor.id, role: 'professor' },
		{ userId: staff.id, role: 'staff' },
	])
	const periodCode = `2098-${suffix.slice(0, 8)}`
	await database.insert(periods).values({ code: periodCode })
	const [lab] = await database.insert(labs).values({ name: `Lab ${suffix}` }).returning()
	const [career] = await database.insert(careers).values({ name: `Career ${suffix}` }).returning()
	const [subject] = await database.insert(subjects).values({ name: `Subject ${suffix}` }).returning()
	assert.ok(lab && career && subject)
	return {
		admin: { id: admin.id, roles: ['admin'] },
		dualRoleAdmin: { id: admin.id, roles: ['admin', 'professor'] },
		adminId: admin.id,
		staffActor: { id: staff.id, roles: ['staff'] },
		professor: { id: professor.id, roles: ['professor'] },
		professorId: professor.id,
		professorEmail: professor.email,
		periodCode,
		lab,
		career,
		subject,
		async clean() {
			await database.delete(groups).where(inArray(groups.professorId, [admin.id, professor.id]))
			await database.delete(userRoles).where(inArray(userRoles.userId, [admin.id, professor.id, staff.id]))
			await database.delete(users).where(inArray(users.id, [admin.id, professor.id, staff.id]))
			await database.delete(periods).where(eq(periods.code, periodCode))
			await database.delete(labs).where(eq(labs.id, lab.id))
			await database.delete(careers).where(eq(careers.id, career.id))
			await database.delete(subjects).where(eq(subjects.id, subject.id))
		},
	}
}

function groupInput(f: Awaited<ReturnType<typeof fixture>>, extra: Record<string, unknown> = {}) {
	return {
		periodCode: f.periodCode,
		labId: f.lab.id,
		careerId: f.career.id,
		subjectId: f.subject.id,
		students: 12,
		teams: 4,
		weekday: 1,
		startTime: '09:00',
		endTime: '10:00',
		...extra,
	}
}

test('admins can inspect and correct any professor group while preserving its owner', async () => {
	const f = await fixture()
	try {
		const group = await registerProfessorGroup(database, f.professor, groupInput(f))
		await database.update(groups).set({ active: false }).where(eq(groups.id, group.id))

		const all = await listAllGroups(database, f.admin, true)
		assert.equal(all.find(({ group: row }) => row.id === group.id)?.professor.id, f.professorId)
		const inspected = await getAnyGroup(database, f.admin, group.id)
		assert.equal(inspected.professor.id, f.professorId)
		assert.equal(inspected.professor.email, f.professorEmail)
		assert.equal(inspected.group.id, group.id)
		const corrected = await updateAnyGroup(database, f.admin, group.id, groupInput(f, { students: 18, teams: 6 }))
		assert.equal(corrected.professorId, f.professorId)
		assert.equal(corrected.students, 18)
		const visible = await listAllGroups(database, f.admin, true)
		assert.equal(visible.find(({ group: row }) => row.id === group.id)?.group.active, false)
	} finally {
		await f.clean()
	}
})

test('admin deactivation and reactivation reuse lab conflict rules; staff cannot manage groups', async () => {
	const f = await fixture()
	try {
		const group = await registerProfessorGroup(database, f.professor, groupInput(f))
		await assert.rejects(listAllGroups(database, f.staffActor, true), /admin/i)
		await assert.rejects(updateAnyGroup(database, f.staffActor, group.id, groupInput(f, { students: 20 })), /admin/i)
		await deactivateAnyGroup(database, f.admin, group.id)
		assert.equal((await listAllGroups(database, f.admin, true)).find(({ group: row }) => row.id === group.id)?.group.active, false)
		await reactivateAnyGroup(database, f.admin, group.id)
		assert.equal((await getAnyGroup(database, f.admin, group.id)).group.active, true)
		const ownGroup = await registerProfessorGroup(database, f.dualRoleAdmin, groupInput(f, { weekday: 2 }))
		assert.deepEqual((await listProfessorGroups(database, f.dualRoleAdmin)).map(({ id }) => id), [ownGroup.id])
		await deactivateProfessorGroup(database, f.dualRoleAdmin, ownGroup.id)
		await deactivateAnyGroup(database, f.admin, group.id)
		const conflict = await registerProfessorGroup(database, f.dualRoleAdmin, groupInput(f))
		await assert.rejects(reactivateAnyGroup(database, f.admin, group.id), /lab.*time|time.*lab|overlap/i)
		await deactivateProfessorGroup(database, f.dualRoleAdmin, conflict.id)
		assert.equal((await reactivateAnyGroup(database, f.admin, group.id)).active, true)
	} finally {
		await f.clean()
	}
})
