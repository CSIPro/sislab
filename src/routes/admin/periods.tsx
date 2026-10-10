import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { currentAcademicPeriodCode } from '../../lib/academic-period.ts'
import { getCurrentSessionFn } from '../../server/auth-functions.ts'
import {
	ensureRegularAcademicPeriodsFn,
	listAcademicPeriodsFn,
	saveAcademicPeriodFn,
} from '../../server/academic-period-functions.ts'

export const Route = createFileRoute('/admin/periods')({
	loader: async () => {
		const user = await getCurrentSessionFn()
		if (!user) throw redirect({ to: '/sign-in' })
		if (!user.roles.includes('admin')) throw redirect({ to: '/dashboard' })
		return listAcademicPeriodsFn()
	},
	component: AcademicPeriodsPage,
})

function AcademicPeriodsPage() {
	const initial = Route.useLoaderData()
	const [periods, setPeriods] = useState(initial.periods)
	const [message, setMessage] = useState('')
	const [busy, setBusy] = useState(false)
	const currentYear = Number(currentAcademicPeriodCode().split('-')[0])

	async function seedPeriods() {
		setBusy(true)
		setMessage('')
		try {
			await ensureRegularAcademicPeriodsFn({ data: { years: [currentYear, currentYear + 1] } })
			const result = await listAcademicPeriodsFn()
			setPeriods(result.periods)
			setMessage('Current and upcoming regular periods are ready.')
		} catch {
			setMessage('Could not create periods. Please try again.')
		} finally {
			setBusy(false)
		}
	}

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const formElement = event.currentTarget
		setBusy(true)
		setMessage('')
		const form = new FormData(formElement)
		try {
			await saveAcademicPeriodFn({
				data: {
					code: String(form.get('code') ?? ''),
					startsOn: String(form.get('startsOn') ?? '') || null,
					endsOn: String(form.get('endsOn') ?? '') || null,
				},
			})
			const result = await listAcademicPeriodsFn()
			setPeriods(result.periods)
			formElement.reset()
			setMessage('Academic period saved.')
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not save this period.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Administration</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)]">Academic periods</h1>
				<p className="text-[var(--sea-ink-soft)]">The suggested period follows the current month in America/Hermosillo. Professors can still choose another period listed here.</p>
				<button className="mt-4 rounded-full bg-[var(--lagoon-deep)] px-5 py-2.5 font-semibold text-white disabled:opacity-60" disabled={busy} onClick={seedPeriods} type="button">
					Add current and next year
				</button>
				<form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={save}>
					<h2 className="sm:col-span-2 text-lg font-semibold">Add or correct a period</h2>
					<label className="grid gap-1 text-sm font-medium">Period code<input className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2" name="code" pattern="[0-9]{4}-[12]" placeholder="2026-1" required /></label>
					<div className="grid grid-cols-2 gap-3">
						<label className="grid gap-1 text-sm font-medium">Starts on<input className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2" name="startsOn" type="date" /></label>
						<label className="grid gap-1 text-sm font-medium">Ends on<input className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2" name="endsOn" type="date" /></label>
					</div>
					<div className="sm:col-span-2"><button className="rounded-full border border-[var(--line)] px-5 py-2.5 font-semibold disabled:opacity-60" disabled={busy} type="submit">Save period</button></div>
				</form>
				{message && <p className="mt-4 text-sm" role="status">{message}</p>}
				<h2 className="mt-8 text-lg font-semibold">Available periods</h2>
				<ul className="mt-3 divide-y divide-[var(--line)]">
					{periods.map((period) => (
						<li className="flex flex-wrap justify-between gap-2 py-3" key={period.code}>
							<span className="font-semibold">{period.code}</span>
							<span className="text-sm text-[var(--sea-ink-soft)]">{period.startsOn && period.endsOn ? `${period.startsOn} to ${period.endsOn}` : 'Dates not set'}</span>
						</li>
					))}
				</ul>
			</section>
		</main>
	)
}
