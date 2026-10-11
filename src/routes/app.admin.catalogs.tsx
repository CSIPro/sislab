import { createFileRoute, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ActiveBadge } from "../components/active-badge.tsx";
import { ActionNotice, type NoticeState } from "../components/notice.tsx";
import { Page, PageHeader } from "../components/page.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardHeader, CardTitle } from "../components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../components/ui/dialog.tsx";
import { Field, FieldLabel } from "../components/ui/field.tsx";
import { Input } from "../components/ui/input.tsx";
import { Textarea } from "../components/ui/textarea.tsx";
import { userFacingError } from "../lib/user-facing-error.ts";
import { cn } from "../lib/utils.ts";
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

const kinds = ["labs", "careers", "subjects"] as const;

export const Route = createFileRoute("/app/admin/catalogs")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		const [labs, careers, subjects] = await Promise.all(
			kinds.map((kind) => listCatalogEntriesFn({ data: { kind } })),
		);
		return { labs, careers, subjects };
	},
	component: CatalogsPage,
});

const catalogs: Record<
	CatalogKind,
	{
		title: string;
		addLabel: string;
		placeholder: string;
		active: string;
		retired: string;
	}
> = {
	labs: {
		title: "Laboratorios",
		addLabel: "Agregar laboratorio",
		placeholder: "SN-210",
		active: "Activo",
		retired: "Retirado",
	},
	careers: {
		title: "Carreras",
		addLabel: "Agregar carrera",
		placeholder: "Nombre de la carrera",
		active: "Activa",
		retired: "Retirada",
	},
	subjects: {
		title: "Materias",
		addLabel: "Agregar materia",
		placeholder: "Nombre de la materia",
		active: "Activa",
		retired: "Retirada",
	},
};

function CatalogsPage() {
	const initial = Route.useLoaderData();
	const [entries, setEntries] =
		useState<Record<CatalogKind, CatalogEntry[]>>(initial);
	const [renaming, setRenaming] = useState<{
		kind: CatalogKind;
		entry: CatalogEntry;
		name: string;
	} | null>(null);
	const [notice, setNotice] = useState<NoticeState>(null);
	const [busy, setBusy] = useState(false);

	async function refresh(kind: CatalogKind) {
		const result = await listCatalogEntriesFn({ data: { kind } });
		setEntries((current) => ({ ...current, [kind]: result }));
	}

	async function run(
		fallback: string,
		action: () => Promise<string>,
	): Promise<boolean> {
		setBusy(true);
		setNotice(null);
		try {
			setNotice({ text: await action(), error: false });
			return true;
		} catch (error) {
			setNotice({ text: userFacingError(error, fallback), error: true });
			return false;
		} finally {
			setBusy(false);
		}
	}

	async function add(event: FormEvent<HTMLFormElement>, kind: CatalogKind) {
		event.preventDefault();
		const form = event.currentTarget;
		const name = String(new FormData(form).get("name") ?? "");
		const added = await run("No se pudo guardar este elemento.", async () => {
			await addCatalogEntryFn({ data: { kind, name } });
			await refresh(kind);
			return `Se agregó “${name.trim()}” a ${catalogs[kind].title.toLocaleLowerCase("es-MX")}.`;
		});
		if (added) form.reset();
	}

	const setActive = (kind: CatalogKind, entry: CatalogEntry, active: boolean) =>
		run(
			active
				? "No se pudo reactivar este elemento."
				: "No se pudo retirar este elemento.",
			async () => {
				const change = active ? reactivateCatalogEntryFn : retireCatalogEntryFn;
				await change({ data: { kind, id: entry.id } });
				await refresh(kind);
				return active
					? `“${entry.name}” vuelve a ofrecerse al registrar grupos.`
					: `“${entry.name}” ya no se ofrece. Los grupos que lo usan conservan su etiqueta.`;
			},
		);

	async function rename(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!renaming) return;
		const { kind, entry, name } = renaming;
		const renamed = await run(
			"No se pudo cambiar el nombre de este elemento.",
			async () => {
				await renameCatalogEntryFn({ data: { kind, id: entry.id, name } });
				await refresh(kind);
				return "Se actualizó el nombre. Los grupos existentes conservan la etiqueta anterior.";
			},
		);
		if (renamed) setRenaming(null);
	}

	async function importSupplied(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		const lines = (kind: CatalogKind) =>
			String(form.get(kind) ?? "")
				.split(/\r?\n/)
				.filter((value) => value.trim());
		const imported = await run(
			"No se pudieron cargar los valores.",
			async () => {
				await importCatalogValuesFn({
					data: {
						labs: lines("labs"),
						careers: lines("careers"),
						subjects: lines("subjects"),
					},
				});
				await Promise.all(kinds.map(refresh));
				return "Se cargaron los valores. Los que ya existían se omitieron.";
			},
		);
		if (imported) formElement.reset();
	}

	return (
		<Page size="compact">
			<PageHeader
				description="Las listas que se usan al registrar grupos. Un elemento retirado deja de ofrecerse, pero sigue visible en los grupos y solicitudes que ya lo usan."
				title="Catálogos"
			/>

			<ActionNotice notice={notice} />

			<div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-start gap-6">
				{kinds.map((kind) => {
					const catalog = catalogs[kind];
					return (
						<Card aria-labelledby={`catalog-${kind}`} key={kind}>
							<CardHeader className="items-baseline">
								<CardTitle id={`catalog-${kind}`}>{catalog.title}</CardTitle>
								<span className="text-[13.5px] text-muted-foreground">
									{entries[kind].length === 1
										? "1 elemento"
										: `${entries[kind].length} elementos`}
								</span>
							</CardHeader>
							<form
								className="flex items-end gap-2.5"
								onSubmit={(event) => void add(event, kind)}
							>
								<Field>
									<FieldLabel htmlFor={`catalog-${kind}-name`}>
										{catalog.addLabel}
									</FieldLabel>
									<Input
										id={`catalog-${kind}-name`}
										name="name"
										placeholder={catalog.placeholder}
										required
										variant="filled"
									/>
								</Field>
								<Button disabled={busy} size="lg" type="submit">
									Agregar
								</Button>
							</form>
							<ul>
								{entries[kind].map((entry) => (
									<li
										className="flex min-h-[52px] flex-wrap items-center gap-x-2.5 border-t py-1"
										key={entry.id}
									>
										<span
											className={cn(
												"min-w-0 flex-[1_1_140px] font-medium [overflow-wrap:break-word]",
												!entry.active && "font-normal text-muted-foreground",
											)}
										>
											{entry.name}
										</span>
										<ActiveBadge
											active={entry.active}
											labels={[catalog.active, catalog.retired]}
										/>
										<Button
											aria-label={`Cambiar el nombre de ${entry.name}`}
											className="text-sm"
											disabled={busy}
											onClick={() =>
												setRenaming({ kind, entry, name: entry.name })
											}
											size="inline"
											variant="link"
										>
											Renombrar
										</Button>
										<Button
											aria-label={`${entry.active ? "Retirar" : "Reactivar"} ${entry.name}`}
											className="text-sm"
											disabled={busy}
											onClick={() => void setActive(kind, entry, !entry.active)}
											size="inline"
											variant="link"
										>
											{entry.active ? "Retirar" : "Reactivar"}
										</Button>
									</li>
								))}
							</ul>
						</Card>
					);
				})}
			</div>

			<Card asChild>
				<details>
					<summary className="cursor-pointer font-bold">
						Cargar varios valores a la vez
					</summary>
					<form className="flex flex-col gap-4" onSubmit={importSupplied}>
						<p className="text-[14.5px] text-muted-foreground">
							Escribe un valor por línea. Los que ya existen se omiten.
						</p>
						<div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
							{kinds.map((kind) => (
								<Field key={kind}>
									<FieldLabel htmlFor={`catalog-import-${kind}`}>
										{catalogs[kind].title}
									</FieldLabel>
									<Textarea id={`catalog-import-${kind}`} name={kind} />
								</Field>
							))}
						</div>
						<div>
							<Button disabled={busy} type="submit" variant="outline">
								Cargar valores
							</Button>
						</div>
					</form>
				</details>
			</Card>

			<Dialog
				onOpenChange={(open) => {
					if (!open) setRenaming(null);
				}}
				open={renaming !== null}
			>
				<DialogContent className="rounded-lg">
					<form className="flex flex-col gap-4" onSubmit={rename}>
						<DialogHeader>
							<DialogTitle>Cambiar nombre</DialogTitle>
							<DialogDescription>
								Los grupos y solicitudes existentes conservan la etiqueta
								anterior.
							</DialogDescription>
						</DialogHeader>
						<Field>
							<FieldLabel htmlFor="catalog-rename">Nombre</FieldLabel>
							<Input
								id="catalog-rename"
								onChange={(event) =>
									setRenaming(
										(current) =>
											current && { ...current, name: event.target.value },
									)
								}
								required
								value={renaming?.name ?? ""}
								variant="filled"
							/>
						</Field>
						<DialogFooter>
							<Button
								onClick={() => setRenaming(null)}
								size="lg"
								variant="outline"
							>
								Cancelar
							</Button>
							<Button disabled={busy} size="lg" type="submit">
								Guardar nombre
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</Page>
	);
}
