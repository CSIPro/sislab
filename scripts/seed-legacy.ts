import { readFile } from 'node:fs/promises'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: ['.env.local', '.env'] })

const [{ db }, { labExercises }, { importCatalogValues }, { createLabExercise }, { legacyCatalogs, legacyExercises }] =
	await Promise.all([
		import('../src/db/index.ts'),
		import('../src/db/schema.ts'),
		import('../src/server/catalogs.ts'),
		import('../src/server/lab-exercises.ts'),
		import('../src/lib/legacy-seed.ts'),
	])

const admin = { roles: ['admin'] }

async function legacyFile(name: string) {
	return JSON.parse(await readFile(new URL(`../docs/legacy-data/${name}.json`, import.meta.url), 'utf8'))
}

try {
	const [labs, careers, subjects, exercises] = await Promise.all(
		['labs', 'careers', 'signatures', 'exercises'].map(legacyFile),
	)

	// Running the seed again adds only what is missing. It never overwrites an admin's later edits.
	await db.transaction(async (transaction) => {
		const catalogs = await importCatalogValues(transaction, admin, legacyCatalogs(labs, careers, subjects))
		const existing = new Set(
			(await transaction.select().from(labExercises)).map(({ number, name }) => `${number}\n${name}`),
		)
		let created = 0
		for (const exercise of legacyExercises(exercises)) {
			if (existing.has(`${exercise.number}\n${exercise.name}`)) continue
			await createLabExercise(transaction, admin, exercise)
			created += 1
		}
		console.log(
			`Catalogs now hold ${catalogs.labs.length} labs, ${catalogs.careers.length} careers, and ${catalogs.subjects.length} subjects.`,
		)
		console.log(`Added ${created} lab exercises; ${existing.size} were already present.`)
	})
} catch (error) {
	console.error(error instanceof Error ? error.message : 'Seeding failed.')
	process.exitCode = 1
} finally {
	await db.$client.end()
}
