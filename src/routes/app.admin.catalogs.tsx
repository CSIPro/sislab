import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { getCurrentSessionFn } from '../server/auth-functions.ts'
import { userFacingError } from '../lib/user-facing-error.ts'
import {
	addCatalogEntryFn,
	importCatalogValuesFn,
	listCatalogEntriesFn,
	renameCatalogEntryFn,
	retireCatalogEntryFn,
} from '../server/catalog-functions.ts'
import type { CatalogEntry, CatalogKind } from '../server/catalogs.ts'

export const Route = createFileRoute('/app/admin/catalogs')({
	loader: async () => {
		const user = await getCurrentSessionFn()
		if (!user) throw redirect({ to: '/sign-in' })
		if (!user.roles.includes('admin')) throw redirect({ to: '/app/dashboard' })
		const [labs, careers, subjects] = await Promise.all(
			(['labs', 'careers', 'subjects'] as const).map((kind) =>
				listCatalogEntriesFn({ data: { kind } }),
			),
		)
		return { labs, careers, subjects }
	},
	component: CatálogosPage,
})

const labels: Record<CatalogKind, string> = {
	labs: 'Laboratorios',
	careers: 'Carreras',
	subjects: 'Materias',
}

function CatálogosPage() {
	const initial = Route.useLoaderData()
	const [entries, setEntries] = useState<Record<CatalogKind, CatalogEntry[]>>({
		labs: initial.labs,
		careers: initial.careers,
		subjects: initial.subjects,
	})
	const [message, setMessage] = useState('')
	const [busy, setBusy] = useState(false)

	async function refresh(kind: CatalogKind) {
		const result = await listCatalogEntriesFn({ data: { kind } })
		setEntries((current) => ({ ...current, [kind]: result }))
	}

	async function add(event: FormEvent<HTMLFormElement>, kind: CatalogKind) {
		event.preventDefault()
		const form = event.currentTarget
		const data = new FormData(form)
		setBusy(true)
		setMessage('')
		try {
			await addCatalogEntryFn({ data: { kind, name: String(data.get('name') ?? '') } })
			await refresh(kind)
			form.reset()
			setMessage(`Se guardó el elemento de ${labels[kind].toLowerCase()}.`)
		} catch (error) {
			setMessage(userFacingError(error, 'No se pudo guardar este elemento.'))
		} finally {
			setBusy(false)
		}
	}

	async function rename(kind: CatalogKind, entry: CatalogEntry) {
		const name = window.prompt('Nuevo nombre para el catálogo', entry.name)
		if (name === null) return
		setBusy(true)
		setMessage('')
		try {
			await renameCatalogEntryFn({ data: { kind, id: entry.id, name } })
			await refresh(kind)
			setMessage('Se actualizó el nombre. Las etiquetas de los grupos existentes se conservaron.')
		} catch (error) {
			setMessage(userFacingError(error, 'No se pudo cambiar el nombre de este elemento.'))
		} finally {
			setBusy(false)
		}
	}

	async function retire(kind: CatalogKind, entry: CatalogEntry) {
		setBusy(true)
		setMessage('')
		try {
			await retireCatalogEntryFn({ data: { kind, id: entry.id } })
			await refresh(kind)
			setMessage('Se retiró el elemento. Las etiquetas de los grupos existentes se conservaron.')
		} catch (error) {
			setMessage(userFacingError(error, 'No se pudo retirar este elemento.'))
		} finally {
			setBusy(false)
		}
	}

	async function importSupplied(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const form = new FormData(event.currentTarget)
		const parseLines = (key: CatalogKind) => String(form.get(key) ?? '').split(/\r?\n/).filter((value) => value.trim())
		setBusy(true)
		setMessage('')
		try {
			await importCatalogValuesFn({
				data: { labs: parseLines('labs'), careers: parseLines('careers'), subjects: parseLines('subjects') },
			})
			await Promise.all((['labs', 'careers', 'subjects'] as const).map(refresh))
			setMessage('Se cargaron los valores proporcionados. Si repites la importación, no se crearán duplicados.')
		} catch (error) {
			setMessage(userFacingError(error, 'No se pudieron cargar los valores proporcionados.'))
		} finally {
			setBusy(false)
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--foreground)]">Catálogos</h1>
				<p className="text-[var(--muted-foreground)]">Administra los laboratorios, carreras y materias disponibles en los formularios de grupos. Los valores retirados se conservan en los grupos existentes.</p>
				<form className="mt-8 grid gap-4 sm:grid-cols-3" onSubmit={importSupplied}>
					<h2 className="sm:col-span-3 text-lg font-semibold">Cargar valores proporcionados</h2>
					{(['labs', 'careers', 'subjects'] as const).map((kind) => (
						<label className="grid gap-1 text-sm font-medium" key={kind}>{labels[kind]}<textarea className="min-h-28 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2" name={kind} placeholder="Un valor por línea" /></label>
					))}
					<button className="w-fit rounded-lg bg-[var(--primary)] px-5 py-2.5 font-semibold text-[var(--primary-foreground)] disabled:opacity-60 sm:col-span-3" disabled={busy} type="submit">Cargar catálogos</button>
				</form>
				<div className="mt-8 grid gap-6 lg:grid-cols-3">
					{(['labs', 'careers', 'subjects'] as const).map((kind) => (
						<section className="rounded-xl border border-[var(--border)] p-4" key={kind}>
							<h2 className="text-lg font-semibold">{labels[kind]}</h2>
							<form className="mt-3 flex gap-2" onSubmit={(event) => add(event, kind)}>
								<input aria-label={`Nombre de ${labels[kind].toLowerCase()}`} className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2" name="name" required />
								<button className="rounded-lg border border-[var(--border)] px-4 py-2 font-semibold" disabled={busy} type="submit">Agregar</button>
							</form>
							<ul className="mt-3 divide-y divide-[var(--border)]">
								{entries[kind].map((entry) => (
									<li className="flex items-center justify-between gap-2 py-3" key={entry.id}>
									<span className={entry.active ? '' : 'text-[var(--muted-foreground)] line-through'}>{entry.name}{entry.active ? '' : ' (retirado)'}</span>
										<span className="flex shrink-0 gap-2">
											<button className="text-sm font-semibold underline" disabled={busy} onClick={() => rename(kind, entry)} type="button">Cambiar nombre</button>
											{entry.active && <button className="text-sm font-semibold underline" disabled={busy} onClick={() => retire(kind, entry)} type="button">Retirar</button>}
										</span>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
				{message && <p className="mt-4 text-sm" role="status">{message}</p>}
			</section>
		</main>
	)
}
