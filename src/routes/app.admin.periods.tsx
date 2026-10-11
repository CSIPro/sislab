import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { currentAcademicPeriodCode } from '../lib/academic-period.ts'
import { userFacingError } from '../lib/user-facing-error.ts'
import { getCurrentSessionFn } from '../server/auth-functions.ts'
import {
	ensureRegularAcademicPeriodsFn,
	listAcademicPeriodsFn,
	saveAcademicPeriodFn,
} from '../server/academic-period-functions.ts'

export const Route = createFileRoute('/app/admin/periods')({
	loader: async () => {
		const user = await getCurrentSessionFn()
		if (!user) throw redirect({ to: '/sign-in' })
		if (!user.roles.includes('admin')) throw redirect({ to: '/app/dashboard' })
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
			setMessage('Los periodos regulares de este año y del próximo están listos.')
		} catch {
			setMessage('No se pudieron crear los periodos. Inténtalo de nuevo.')
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
			setMessage('Se guardó el periodo académico.')
		} catch (error) {
			setMessage(userFacingError(error, 'No se pudo guardar este periodo.'))
		} finally {
			setBusy(false)
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Administración</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--foreground)]">Periodos académicos</h1>
				<p className="text-[var(--muted-foreground)]">El periodo sugerido depende del mes actual en America/Hermosillo. El profesorado puede elegir otro periodo disponible.</p>
				<button className="mt-4 rounded-lg bg-[var(--primary)] px-5 py-2.5 font-semibold text-[var(--primary-foreground)] disabled:opacity-60" disabled={busy} onClick={seedPeriods} type="button">
					Agregar periodos actuales y del próximo año
				</button>
				<form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={save}>
					<h2 className="sm:col-span-2 text-lg font-semibold">Agregar o corregir un periodo</h2>
					<label className="grid gap-1 text-sm font-medium">Clave del periodo<input className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2" name="code" pattern="[0-9]{4}-[12]" placeholder="2026-1" required /></label>
					<div className="grid grid-cols-2 gap-3">
						<label className="grid gap-1 text-sm font-medium">Fecha de inicio<input className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2" name="startsOn" type="date" /></label>
						<label className="grid gap-1 text-sm font-medium">Fecha de término<input className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2" name="endsOn" type="date" /></label>
					</div>
					<div className="sm:col-span-2"><button className="rounded-lg border border-[var(--border)] px-5 py-2.5 font-semibold disabled:opacity-60" disabled={busy} type="submit">Guardar periodo</button></div>
				</form>
				{message && <p className="mt-4 text-sm" role="status">{message}</p>}
				<h2 className="mt-8 text-lg font-semibold">Periodos disponibles</h2>
				<ul className="mt-3 divide-y divide-[var(--border)]">
					{periods.map((period) => (
						<li className="flex flex-wrap justify-between gap-2 py-3" key={period.code}>
							<span className="font-semibold">{period.code}</span>
							<span className="text-sm text-[var(--muted-foreground)]">{period.startsOn && period.endsOn ? `${period.startsOn} al ${period.endsOn}` : 'Fechas sin definir'}</span>
						</li>
					))}
				</ul>
			</section>
		</main>
	)
}
