import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { and, eq, gt, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { getRequestHeader } from '@tanstack/react-start/server'
import { db } from '../db/index.ts'
import type * as schema from '../db/schema.ts'
import { sessions, userRoles, users } from '../db/schema.ts'

const PASSWORD_KEY_LENGTH = 64
const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000
const BOOTSTRAP_LOCK_ID = 731_042_001

export type AuthDatabase = NodePgDatabase<typeof schema>

export type AuthUser = {
	id: string
	email: string
	name: string
	surname: string
	roles: Array<'professor' | 'staff' | 'admin'>
}

export const SESSION_COOKIE = 'sislab_session'

type BootstrapAdminInput = {
	email: string
	name: string
	surname: string
	password: string
}

type SignInInput = {
	email: string
	password: string
	now?: Date
}

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString('base64url')
	const derivedKey = await deriveKey(password, salt)
	return `scrypt$${salt}$${derivedKey.toString('base64url')}`
}

export async function verifyPassword(
	password: string,
	passwordHash: string,
): Promise<boolean> {
	const [algorithm, salt, encodedKey, extra] = passwordHash.split('$')
	if (algorithm !== 'scrypt' || !salt || !encodedKey || extra !== undefined) {
		return false
	}

	const expected = Buffer.from(encodedKey, 'base64url')
	if (expected.length !== PASSWORD_KEY_LENGTH) return false

	const actual = await deriveKey(password, salt)
	return timingSafeEqual(actual, expected)
}

export async function bootstrapAdmin(
	database: AuthDatabase,
	input: BootstrapAdminInput,
): Promise<typeof users.$inferSelect> {
	const email = normalizeEmail(input.email)
	validatePassword(input.password)
	const name = input.name.trim()
	const surname = input.surname.trim()
	if (!name || !surname) throw new Error('Admin name and surname are required.')
	const passwordHash = await hashPassword(input.password)

	return database.transaction(async (transaction) => {
		await transaction.execute(sql`SELECT pg_advisory_xact_lock(${BOOTSTRAP_LOCK_ID})`)
		const [existingAdmin] = await transaction
			.select({ userId: userRoles.userId })
			.from(userRoles)
			.where(eq(userRoles.role, 'admin'))
			.limit(1)
		if (existingAdmin) {
			throw new Error('The first admin has already been provisioned.')
		}

		const [existingUser] = await transaction
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, email))
			.limit(1)
		if (existingUser) throw new Error('An account already uses this email.')

		const [admin] = await transaction
			.insert(users)
			.values({
				email,
				passwordHash,
				name,
				surname,
				active: true,
				verifiedAt: new Date(),
			})
			.returning()
		if (!admin) throw new Error('Could not create the admin account.')
		await transaction.insert(userRoles).values({ userId: admin.id, role: 'admin' })
		return admin
	})
}

export async function signIn(
	database: AuthDatabase,
	input: SignInInput,
): Promise<{ token: string; expiresAt: Date } | null> {
	const email = normalizeEmail(input.email)
	const [user] = await database
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1)
	if (!user?.active || !user.passwordHash) return null
	if (!(await verifyPassword(input.password, user.passwordHash))) return null

	const token = randomBytes(32).toString('base64url')
	const expiresAt = new Date((input.now ?? new Date()).getTime() + SESSION_LIFETIME_MS)
	await database.insert(sessions).values({
		userId: user.id,
		tokenHash: hashSessionToken(token),
		expiresAt,
	})
	return { token, expiresAt }
}

export async function getSession(
	database: AuthDatabase,
	token: string,
	options: { now?: Date } = {},
): Promise<AuthUser | null> {
	if (!token) return null
	const [user] = await database
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			surname: users.surname,
		})
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(
			and(
				eq(sessions.tokenHash, hashSessionToken(token)),
				gt(sessions.expiresAt, options.now ?? new Date()),
				eq(users.active, true),
			),
		)
		.limit(1)
	if (!user) return null

	const roles = await database
		.select({ role: userRoles.role })
		.from(userRoles)
		.where(eq(userRoles.userId, user.id))
	return { ...user, roles: roles.map(({ role }) => role) }
}

export async function signOut(database: AuthDatabase, token: string): Promise<void> {
	if (!token) return
	await database.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)))
}

export async function requireUser(): Promise<AuthUser> {
	const token = readSessionCookie(getRequestHeader('cookie'))
	const user = token ? await getSession(db, token) : null
	if (!user) throw new Error('An active session is required.')
	return user
}

export async function requireRole(
	role: 'professor' | 'staff' | 'admin',
): Promise<AuthUser> {
	const user = await requireUser()
	if (!hasRole(user.roles, role)) throw new Error(`The ${role} role is required.`)
	return user
}

export function hasRole(
	roles: readonly ('professor' | 'staff' | 'admin')[],
	requiredRole: 'professor' | 'staff' | 'admin',
): boolean {
	return roles.includes(requiredRole) || (requiredRole === 'staff' && roles.includes('admin'))
}

export function normalizeEmail(email: string): string {
	const normalized = email.trim().toLowerCase()
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
		throw new Error('Enter a valid email address.')
	}
	return normalized
}

export function validatePassword(password: string): void {
	if (password.length < 12) throw new Error('Password must be at least 12 characters.')
}

function hashSessionToken(token: string): string {
	return createHash('sha256').update(token).digest('hex')
}

function deriveKey(password: string, salt: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scrypt(
			password,
			salt,
			PASSWORD_KEY_LENGTH,
			{ N: 16_384, r: 8, p: 1 },
			(error, derivedKey) => {
				if (error) reject(error)
				else resolve(derivedKey as Buffer)
			},
		)
	})
}

export function readSessionCookie(cookieHeader: string | undefined): string | null {
	for (const cookie of cookieHeader?.split(';') ?? []) {
		const [name, ...value] = cookie.trim().split('=')
		if (name === SESSION_COOKIE) {
			try {
				return decodeURIComponent(value.join('='))
			} catch {
				return null
			}
		}
	}
	return null
}
