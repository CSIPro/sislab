import { timingSafeEqual } from 'node:crypto'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: ['.env.local', '.env'] })

const [{ db }, { bootstrapAdmin }] = await Promise.all([
	import('../src/db/index.ts'),
	import('../src/server/auth.server.ts'),
])

const suppliedSecret = process.env.BOOTSTRAP_ADMIN_SECRET
const configuredSecret = process.env.SISLAB_BOOTSTRAP_SECRET
const email = process.env.BOOTSTRAP_ADMIN_EMAIL
const name = process.env.BOOTSTRAP_ADMIN_NAME
const surname = process.env.BOOTSTRAP_ADMIN_SURNAME
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD

function matchesSecret(supplied: string | undefined, configured: string | undefined) {
	if (!supplied || !configured) return false
	const suppliedBytes = Buffer.from(supplied)
	const configuredBytes = Buffer.from(configured)
	return suppliedBytes.length === configuredBytes.length && timingSafeEqual(suppliedBytes, configuredBytes)
}

if (!matchesSecret(suppliedSecret, configuredSecret)) {
	console.error('Bootstrap secret is missing or invalid.')
	process.exitCode = 1
} else if (!email || !name || !surname || !password) {
	console.error(
		'Provide BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_SURNAME, and BOOTSTRAP_ADMIN_PASSWORD.',
	)
	process.exitCode = 1
} else {
	try {
		const admin = await bootstrapAdmin(db, { email, name, surname, password })
		console.log(`Provisioned the first Sislab admin account for ${admin.email}.`)
	} catch (error) {
		console.error(error instanceof Error ? error.message : 'Admin provisioning failed.')
		process.exitCode = 1
	} finally {
		await db.$client.end()
	}
}
