import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ActiveBadge } from "../components/active-badge.tsx";
import { ActionNotice, type NoticeState } from "../components/notice.tsx";
import { EmptyState, Footnote, Page, PageHeader } from "../components/page.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardFooter, CardTitle } from "../components/ui/card.tsx";
import {
	Field,
	FieldDescription,
	FieldLabel,
} from "../components/ui/field.tsx";
import { Input } from "../components/ui/input.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableEmpty,
	TableHead,
	TableHeader,
	TableRow,
} from "../components/ui/table.tsx";
import { Textarea } from "../components/ui/textarea.tsx";
import { catalogCopy, isCatalogKind } from "../lib/catalog-copy.ts";
import { searchable } from "../lib/search.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	addCatalogEntryFn,
	importCatalogValuesFn,
	listCatalogEntriesFn,
	reactivateCatalogEntryFn,
	renameCatalogEntryFn,
	retireCatalogEntryFn,
} from "../server/catalog-functions.ts";
import type { CatalogEntry, CatalogKind } from "../server/catalogs.ts";

export const Route = createFileRoute("/app/admin/catalogs/$kind")({
	loader: async ({ params: { kind } }) => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		if (!isCatalogKind(kind)) throw redirect({ to: "/app/admin/catalogs" });
		return { kind, entries: await listCatalogEntriesFn({ data: { kind } }) };
	},
	component: CatalogRoute,
});

/** The panel shows a name form or the bulk form in place of the detail. */
type Draft =
	| { mode: "entry"; id: string | null; name: string }
	| { mode: "import"; text: string };

const emptyDraft = (): Draft => ({ mode: "entry", id: null, name: "" });

function CatalogRoute() {
	const { kind } = Route.useLoaderData();
	// The key drops the previous catalog's state when the address changes kind.
	return <CatalogPage key={kind} kind={kind} />;
}

function CatalogPage({ kind }: { kind: CatalogKind }) {
	const catalog = catalogCopy[kind];
	const router = useRouter();
	// Read the loader's list directly, so a reload after a change or on return shows here.
	const { entries } = Route.useLoaderData();
	const [selectedId, setSelectedId] = useState(
		(entries.find(({ active }) => active) ?? entries[0])?.id ?? null,
	);
	const [draft, setDraft] = useState<Draft | null>(
		entries.length === 0 ? emptyDraft : null,
	);
	const [search, setSearch] = useState("");
	const [notice, setNotice] = useState<NoticeState>(null);
	const [busy, setBusy] = useState(false);

	const query = searchable(search.trim());
	const visible = entries.filter((entry) =>
		searchable(entry.name).includes(query),
	);
	const selected = entries.find(({ id }) => id === selectedId) ?? null;

	function open(next: Draft) {
		setDraft(next);
		setNotice(null);
	}

	function select(entryId: string) {
		setSelectedId(entryId);
		setDraft(null);
		setNotice(null);
	}

	async function run(fallback: string, action: () => Promise<string>) {
		setBusy(true);
		setNotice(null);
		try {
			const text = await action();
			await router.invalidate();
			setDraft(null);
			setNotice({ text, error: false });
		} catch (error) {
			setNotice({ text: userFacingError(error, fallback), error: true });
		} finally {
			setBusy(false);
		}
	}

	function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!draft) return;
		if (draft.mode === "import") {
			const names = draft.text.split(/\r?\n/).filter((value) => value.trim());
			if (names.length === 0) {
				setNotice({ text: "Escribe al menos un valor.", error: true });
				return;
			}
			return run("No se pudieron cargar los valores.", async () => {
				await importCatalogValuesFn({ data: { [kind]: names } });
				return "Se cargaron los valores. Los que ya existían se omitieron.";
			});
		}
		const { id, name } = draft;
		if (id) {
			return run("No se pudo cambiar el nombre de este elemento.", async () => {
				await renameCatalogEntryFn({ data: { kind, id, name } });
				return "Se actualizó el nombre. Los grupos existentes conservan la etiqueta anterior.";
			});
		}
		return run("No se pudo guardar este elemento.", async () => {
			const added = await addCatalogEntryFn({ data: { kind, name } });
			setSelectedId(added.id);
			return `Se agregó “${added.name}” a ${catalog.title.toLocaleLowerCase("es-MX")}.`;
		});
	}

	const setActive = (entry: CatalogEntry, active: boolean) =>
		run(
			active
				? "No se pudo reactivar este elemento."
				: "No se pudo desactivar este elemento.",
			async () => {
				const change = active ? reactivateCatalogEntryFn : retireCatalogEntryFn;
				await change({ data: { kind, id: entry.id } });
				return active
					? `“${entry.name}” vuelve a ofrecerse al registrar grupos.`
					: `“${entry.name}” ya no se ofrece. Los grupos existentes conservan su etiqueta.`;
			},
		);

	return (
		<Page size="compact">
			<Button asChild className="self-start" size="inline" variant="link">
				<Link to="/app/admin/catalogs">
					<ArrowLeft aria-hidden="true" size={18} strokeWidth={2} />
					Catálogos
				</Link>
			</Button>
			<PageHeader
				description={`${catalog.description} Un elemento desactivado deja de ofrecerse, pero sigue visible en los grupos y solicitudes que ya lo usan.`}
				title={catalog.title}
			>
				<Button
					onClick={() => open({ mode: "import", text: "" })}
					size="lg"
					variant="outline"
				>
					Cargar varios
				</Button>
				<Button onClick={() => open(emptyDraft())} size="lg">
					<Plus aria-hidden="true" size={18} strokeWidth={2} />
					{catalog.newLabel}
				</Button>
			</PageHeader>

			<div className="flex flex-wrap items-start gap-6">
				<section className="flex min-w-0 flex-[1.5_1_520px] flex-col gap-4">
					<Field className="max-w-[360px]">
						<FieldLabel htmlFor="catalog-search">Buscar</FieldLabel>
						<Input
							id="catalog-search"
							onChange={(event) => setSearch(event.target.value)}
							placeholder={`Nombre de ${catalog.noun}`}
							type="search"
							value={search}
						/>
					</Field>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-full">Nombre</TableHead>
								<TableHead>Estado</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{visible.map((entry) => {
								const isSelected = !draft && entry.id === selectedId;
								return (
									<TableRow
										data-muted={!entry.active}
										data-state={isSelected ? "selected" : undefined}
										key={entry.id}
									>
										<TableCell className="first:whitespace-normal">
											<Button
												aria-pressed={isSelected}
												className="min-h-0 w-full justify-start rounded-sm px-0 text-left text-[13px] font-normal whitespace-normal text-inherit hover:bg-transparent hover:text-primary-text aria-pressed:font-bold"
												onClick={() => select(entry.id)}
												variant="ghost"
											>
												{entry.name}
											</Button>
										</TableCell>
										<TableCell>
											<ActiveBadge
												active={entry.active}
												labels={catalog.statusLabels}
											/>
										</TableCell>
									</TableRow>
								);
							})}
							{visible.length === 0 && (
								<TableEmpty colSpan={2}>
									{entries.length === 0
										? catalog.emptyText
										: catalog.noMatchText}
								</TableEmpty>
							)}
						</TableBody>
					</Table>
					<Footnote>
						Al cambiar un nombre, los grupos y solicitudes existentes conservan
						la etiqueta anterior.
					</Footnote>
				</section>

				<Card
					aria-labelledby="catalog-panel-title"
					className="max-w-[460px] flex-[1_1_340px]"
				>
					<ActionNotice notice={notice} />
					{draft ? (
						<form className="flex flex-col gap-[18px]" onSubmit={save}>
							<CardTitle className="text-xl" id="catalog-panel-title">
								{draft.mode === "import"
									? "Cargar varios valores"
									: draft.id
										? "Cambiar nombre"
										: catalog.newLabel}
							</CardTitle>
							{draft.mode === "import" ? (
								<Field>
									<FieldLabel htmlFor="catalog-import">
										{catalog.title}
									</FieldLabel>
									<Textarea
										id="catalog-import"
										onChange={(event) =>
											setDraft({ mode: "import", text: event.target.value })
										}
										required
										rows={8}
										value={draft.text}
									/>
									<FieldDescription>
										Escribe un valor por línea. Los que ya existen se omiten.
									</FieldDescription>
								</Field>
							) : (
								<Field>
									<FieldLabel htmlFor="catalog-name">Nombre</FieldLabel>
									<Input
										autoComplete="off"
										id="catalog-name"
										onChange={(event) =>
											setDraft({ ...draft, name: event.target.value })
										}
										placeholder={catalog.placeholder}
										required
										value={draft.name}
									/>
								</Field>
							)}
							<CardFooter>
								<Button disabled={busy} size="lg" type="submit">
									{draft.mode === "import"
										? "Cargar valores"
										: draft.id
											? "Guardar nombre"
											: `Crear ${catalog.noun}`}
								</Button>
								<Button
									disabled={busy}
									onClick={() => setDraft(null)}
									size="lg"
									variant="outline"
								>
									Cancelar
								</Button>
							</CardFooter>
						</form>
					) : selected ? (
						<>
							<div className="flex items-start justify-between gap-3">
								<div className="flex min-w-0 flex-col">
									<span className="text-[13px] text-muted-foreground first-letter:uppercase">
										{catalog.noun}
									</span>
									<CardTitle
										className="text-primary-text [overflow-wrap:anywhere]"
										id="catalog-panel-title"
									>
										{selected.name}
									</CardTitle>
								</div>
								<ActiveBadge
									active={selected.active}
									labels={catalog.statusLabels}
								/>
							</div>
							<CardFooter>
								<Button
									disabled={busy}
									onClick={() =>
										open({
											mode: "entry",
											id: selected.id,
											name: selected.name,
										})
									}
									size="lg"
								>
									Cambiar nombre
								</Button>
								<Button
									disabled={busy}
									onClick={() => void setActive(selected, !selected.active)}
									size="lg"
									variant="outline"
								>
									{selected.active ? "Desactivar" : "Reactivar"}
								</Button>
							</CardFooter>
						</>
					) : (
						<EmptyState id="catalog-panel-title">
							{catalog.chooseText}
						</EmptyState>
					)}
				</Card>
			</div>
		</Page>
	);
}
