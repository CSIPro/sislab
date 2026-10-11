import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../src/db/schema.ts'
import {
	ensureRegularAcademicPeriods,
	listAcademicPeriods,
	listAcademicPeriodsWithGroupCounts,
	saveAcademicPeriod,
} from '../src/server/academic-periods.ts'

const connectionString = process.env.DATABASE_URL_TEST
if (!connectionString) {
	throw new Error('Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.')
}

const pool = new Pool({ connectionString })
const database = drizzle(pool, { schema })
const testYear = 2098

after(async () => {
	await pool.query('DELETE FROM periods WHERE code LIKE $1', [`${testYear}-%`])
	await pool.end()
})

test('admins can seed regular periods repeatedly and correct optional dates', async () => {
	const firstSeed = await ensureRegularAcademicPeriods(database, [testYear, testYear + 1])
	const secondSeed = await ensureRegularAcademicPeriods(database, [testYear, testYear + 1])
	assert.deepEqual(firstSeed.map(({ code }) => code), ['2098-1', '2098-2', '2099-1', '2099-2'])
	assert.deepEqual(secondSeed.map(({ code }) => code), firstSeed.map(({ code }) => code))
	assert.ok(secondSeed.every(({ startsOn, endsOn }) => startsOn === null && endsOn === null))

	const updated = await saveAcademicPeriod(database, {
		code: '2098-1',
		startsOn: '2098-01-12',
		endsOn: '2098-06-30',
	})
	assert.equal(updated.startsOn, '2098-01-12')
	assert.equal(updated.endsOn, '2098-06-30')
	await assert.rejects(
		saveAcademicPeriod(database, {
			code: '2098-1',
			startsOn: '2098-06-30',
			endsOn: '2098-01-12',
		}),
		/on or after the start date/i,
	)
})

test('suggestion uses the Hermosillo month at January and July boundaries', async () => {
	await ensureRegularAcademicPeriods(database, [testYear])
	const january = await listAcademicPeriods(database, new Date('2098-01-01T07:30:00.000Z'))
	const july = await listAcademicPeriods(database, new Date('2098-07-01T07:30:00.000Z'))
	assert.equal(january.suggestedCode, '2098-1')
	assert.equal(july.suggestedCode, '2098-2')
})

test('admins see how many groups each period holds', async () => {
	await ensureRegularAcademicPeriods(database, [testYear])
	const listed = await listAcademicPeriodsWithGroupCounts(database)
	const seeded = listed.filter(({ code }) => [`${testYear}-1`, `${testYear}-2`].includes(code))
	assert.deepEqual(
		seeded.map(({ code, groupCount }) => [code, groupCount]),
		[['2098-1', 0], ['2098-2', 0]],
	)
})
