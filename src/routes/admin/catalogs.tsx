import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { getCurrentSessionFn } from '../../server/auth-functions.ts'
import {
	addCatalogEntryFn,
	importCatalogValuesFn,
	listCatalogEntriesFn,
	renameCatalogEntryFn,
	retireCatalogEntryFn,
} from '../../server/catalog-functions.ts'
import type { CatalogEntry, CatalogKind } from '../../server/catalogs.ts'

export const Route = createFileRoute('/admin/catalogs')({
	loader: async () => {
		const user = await getCurrentSessionFn()
		if (!user) throw redirect({ to: '/sign-in' })
		if (!user.roles.includes('admin')) throw redirect({ to: '/dashboard' })
		const [labs, careers, subjects] = await Promise.all(
			(['labs', 'careers', 'subjects'] as const).map((kind) =>
				listCatalogEntriesFn({ data: { kind } }),
			),
		)
		return { labs, careers, subjects }
	},
	component: CatalogsPage,
})

const labels: Record<CatalogKind, string> = {
	labs: 'Laboratories',
	careers: 'Careers',
	subjects: 'Subjects',
}

function CatalogsPage() {
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
			setMessage(`${labels[kind]} entry saved.`)
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not save this entry.')
		} finally {
			setBusy(false)
		}
	}

	async function rename(kind: CatalogKind, entry: CatalogEntry) {
		const name = window.prompt('New catalog label', entry.name)
		if (name === null) return
		setBusy(true)
		setMessage('')
		try {
			await renameCatalogEntryFn({ data: { kind, id: entry.id, name } })
			await refresh(kind)
			setMessage('Catalog label updated. Existing group labels are preserved.')
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not rename this entry.')
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
			setMessage('Catalog entry retired. Existing group labels are preserved.')
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not retire this entry.')
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
			setMessage('Supplied catalog values loaded. Repeating this import will not create duplicates.')
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not import the supplied values.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Administration</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)]">Catalogs</h1>
				<p className="text-[var(--sea-ink-soft)]">Manage laboratories, careers, and subjects used on group forms. Retired values stay attached to historical group labels.</p>
				<form className="mt-8 grid gap-4 sm:grid-cols-3" onSubmit={importSupplied}>
					<h2 className="sm:col-span-3 text-lg font-semibold">Load supplied values</h2>
					{(['labs', 'careers', 'subjects'] as const).map((kind) => (
						<label className="grid gap-1 text-sm font-medium" key={kind}>{labels[kind]}<textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2" name={kind} placeholder="One supplied value per line" /></label>
					))}
					<button className="w-fit rounded-full bg-[var(--lagoon-deep)] px-5 py-2.5 font-semibold text-white disabled:opacity-60 sm:col-span-3" disabled={busy} type="submit">Load supplied catalog values</button>
				</form>
				<div className="mt-8 grid gap-6 lg:grid-cols-3">
					{(['labs', 'careers', 'subjects'] as const).map((kind) => (
						<section className="rounded-xl border border-[var(--line)] p-4" key={kind}>
							<h2 className="text-lg font-semibold">{labels[kind]}</h2>
							<form className="mt-3 flex gap-2" onSubmit={(event) => add(event, kind)}>
								<input aria-label={`New ${labels[kind].toLowerCase()} name`} className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2" name="name" required />
								<button className="rounded-full border border-[var(--line)] px-4 py-2 font-semibold" disabled={busy} type="submit">Add</button>
							</form>
							<ul className="mt-3 divide-y divide-[var(--line)]">
								{entries[kind].map((entry) => (
									<li className="flex items-center justify-between gap-2 py-3" key={entry.id}>
										<span className={entry.active ? '' : 'text-[var(--sea-ink-soft)] line-through'}>{entry.name}{entry.active ? '' : ' (retired)'}</span>
										<span className="flex shrink-0 gap-2">
											<button className="text-sm font-semibold underline" disabled={busy} onClick={() => rename(kind, entry)} type="button">Rename</button>
											{entry.active && <button className="text-sm font-semibold underline" disabled={busy} onClick={() => retire(kind, entry)} type="button">Retire</button>}
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
