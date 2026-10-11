import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server'
import { db } from '../db/index.ts'
import {
	getSession,
	readSessionCookie,
	SESSION_COOKIE,
	signOut,
} from './auth.server.ts'
import { createFirstUsableOperations } from './first-usable-operations.ts'

const firstUsableOperations = createFirstUsableOperations(db, async () => null)

type SignInFormData = { email: string; password: string }

function validateSignInInput(data: unknown): SignInFormData {
	if (!data || typeof data !== 'object') throw new Error('Invalid sign-in request.')
	const { email, password } = data as Record<string, unknown>
	if (typeof email !== 'string' || typeof password !== 'string') {
		throw new Error('Invalid sign-in request.')
	}
	return { email, password }
}

export const signInFn = createServerFn({ method: 'POST' })
	.validator(validateSignInInput)
	.handler(async ({ data }) => {
		const session = await firstUsableOperations.signIn(data)
		if (!session) return { ok: false as const, message: 'El correo o la contraseña no son correctos.' }

		const maxAge = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
		setResponseHeader('Set-Cookie', sessionCookie(session.token, maxAge))
		return { ok: true as const }
	})

export const signOutFn = createServerFn({ method: 'POST' }).handler(async () => {
	const token = readSessionCookie(getRequestHeader('cookie'))
	if (token) await signOut(db, token)
	setResponseHeader('Set-Cookie', sessionCookie('', 0))
	return { ok: true as const }
})

export const getCurrentSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
	const token = readSessionCookie(getRequestHeader('cookie'))
	return token ? getSession(db, token) : null
})

function sessionCookie(token: string, maxAge: number): string {
	const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
	return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`
}
