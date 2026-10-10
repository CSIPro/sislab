import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { getCurrentSessionFn, signInFn } from '../server/auth-functions.ts'

export const Route = createFileRoute('/sign-in')({
	beforeLoad: async () => {
		if (await getCurrentSessionFn()) throw redirect({ to: '/dashboard' })
	},
	component: SignInPage,
})

function SignInPage() {
	const navigate = useNavigate()
	const [message, setMessage] = useState('')
	const [busy, setBusy] = useState(false)

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setBusy(true)
		setMessage('')
		const form = new FormData(event.currentTarget)
		try {
			const result = await signInFn({
				data: {
					email: String(form.get('email') ?? ''),
					password: String(form.get('password') ?? ''),
				},
			})
			if (!result.ok) {
				setMessage(result.message)
				return
			}
			await navigate({ to: '/dashboard' })
		} catch {
			setMessage('Sign-in failed. Check your connection and try again.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-lg rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Sislab account</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)]">Sign in</h1>
				<form className="mt-6 grid gap-4" onSubmit={submit}>
					<label className="grid gap-1 text-sm font-medium">
						Email
						<input className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2" name="email" type="email" autoComplete="username" required />
					</label>
					<label className="grid gap-1 text-sm font-medium">
						Password
						<input className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2" name="password" type="password" autoComplete="current-password" required />
					</label>
					{message && <p className="m-0 text-sm text-red-700" role="alert">{message}</p>}
					<button className="rounded-full bg-[var(--lagoon-deep)] px-5 py-2.5 font-semibold text-white disabled:opacity-60" type="submit" disabled={busy}>
						{busy ? 'Signing in…' : 'Sign in'}
					</button>
				</form>
			</section>
		</main>
	)
}
