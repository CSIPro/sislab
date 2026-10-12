import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ActiveBadge } from "../components/active-badge.tsx";
import { FormDialog } from "../components/form-dialog.tsx";
import {
	type QuantityDraft,
	QuantityEditor,
	QuantityList,
	quantityDrafts,
	quantityItems,
	type WasteDraft,
	WasteEditor,
	WasteList,
	wasteDrafts,
	wasteItems,
} from "../components/materials.tsx";
import { ActionNotice, type NoticeState } from "../components/notice.tsx";
import { EmptyState, Footnote, Page, PageHeader } from "../components/page.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardFooter, CardTitle } from "../components/ui/card.tsx";
import { Field, FieldLabel } from "../components/ui/field.tsx";
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
import { searchable } from "../lib/search.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	createLabExerciseFn,
	listLabExercisesFn,
	retireLabExerciseFn,
	updateLabExerciseFn,
} from "../server/lab-exercise-functions.ts";
import type { LabExercise } from "../server/lab-exercises.ts";

export const Route = createFileRoute("/app/admin/exercises")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		return listLabExercisesFn();
	},
	component: LabExercisesPage,
});

type ExerciseDraft = {
	id: string | null;
	number: string;
	name: string;
	reagents: QuantityDraft[];
	equipment: QuantityDraft[];
	waste: WasteDraft[];
};

const emptyDraft = (): ExerciseDraft => ({
	id: null,
	number: "",
	name: "",
	reagents: [],
	equipment: [],
	waste: [],
});

const draftFrom = (exercise: LabExercise): ExerciseDraft => ({
	id: exercise.id,
	number: exercise.number,
	name: exercise.name,
	reagents: quantityDrafts(exercise.materials.reagents),
	equipment: quantityDrafts(exercise.materials.equipment),
	waste: wasteDrafts(exercise.materials.waste),
});

function LabExercisesPage() {
	const initial = Route.useLoaderData();
	const [exercises, setExercises] = useState(initial);
	const [selectedId, setSelectedId] = useState(
		(initial.find(({ active }) => active) ?? initial[0])?.id ?? null,
	);
	/** The lab exercise open in the form dialog. */
	const [draft, setDraft] = useState<ExerciseDraft | null>(null);
	const [search, setSearch] = useState("");
	const [notice, setNotice] = useState<NoticeState>(null);
	const [busy, setBusy] = useState(false);

	const query = searchable(search.trim());
	const visible = exercises.filter((exercise) =>
		searchable(`${exercise.number} ${exercise.name}`).includes(query),
	);
	const selected = exercises.find(({ id }) => id === selectedId) ?? null;

	function open(next: ExerciseDraft | null) {
		setDraft(next);
		setNotice(null);
	}

	function select(exerciseId: string) {
		setSelectedId(exerciseId);
		setNotice(null);
	}

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!draft) return;
		setBusy(true);
		setNotice(null);
		const input = {
			number: draft.number,
			name: draft.name,
			materials: {
				reagents: quantityItems(draft.reagents),
				equipment: quantityItems(draft.equipment),
				waste: wasteItems(draft.waste),
			},
		};
		try {
			const saved = draft.id
				? await updateLabExerciseFn({ data: { id: draft.id, ...input } })
				: await createLabExerciseFn({ data: input });
			setExercises(await listLabExercisesFn());
			setSelectedId(saved.id);
			setDraft(null);
			setNotice({
				text: draft.id
					? "Se actualizó la práctica. Las solicitudes anteriores conservan sus materiales."
					: "Se creó la práctica.",
				error: false,
			});
		} catch (error) {
			setNotice({
				text: userFacingError(error, "No se pudo guardar la práctica."),
				error: true,
			});
		} finally {
			setBusy(false);
		}
	}

	async function retire(exercise: LabExercise) {
		if (
			!window.confirm(
				`¿Desactivar “${exercise.name}”? Ya no estará disponible para solicitudes nuevas.`,
			)
		)
			return;
		setBusy(true);
		setNotice(null);
		try {
			await retireLabExerciseFn({ data: { id: exercise.id } });
			setExercises(await listLabExercisesFn());
			setNotice({
				text: "Se desactivó la práctica. Las solicitudes anteriores conservan sus materiales.",
				error: false,
			});
		} catch (error) {
			setNotice({
				text: userFacingError(error, "No se pudo desactivar la práctica."),
				error: true,
			});
		} finally {
			setBusy(false);
		}
	}

	return (
		<Page size="compact">
			<PageHeader
				description="Catálogo de prácticas de laboratorio. Cada grupo puede solicitar cualquiera de las activas."
				title="Prácticas"
			>
				<Button disabled={busy} onClick={() => open(emptyDraft())} size="lg">
					<Plus aria-hidden="true" size={18} strokeWidth={2} />
					Nueva práctica
				</Button>
			</PageHeader>

			<div className="flex flex-wrap items-start gap-6">
				<section className="flex min-w-0 flex-[1.5_1_520px] flex-col gap-4">
					<Field className="max-w-[360px]">
						<FieldLabel htmlFor="exercises-search">Buscar</FieldLabel>
						<Input
							id="exercises-search"
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Nombre o número de práctica"
							type="search"
							value={search}
						/>
					</Field>
					<Table className="min-w-[620px]">
						<TableHeader>
							<TableRow>
								<TableHead>N.º</TableHead>
								<TableHead>Práctica</TableHead>
								<TableHead>Reactivos</TableHead>
								<TableHead>Equipo</TableHead>
								<TableHead>Residuos</TableHead>
								<TableHead>Estado</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{visible.map((exercise) => {
								const isSelected = exercise.id === selectedId;
								return (
									<TableRow
										data-muted={!exercise.active}
										data-state={isSelected ? "selected" : undefined}
										key={exercise.id}
									>
										<TableCell>{exercise.number}</TableCell>
										<TableCell>
											<Button
												aria-pressed={isSelected}
												className="min-h-0 w-full justify-start rounded-sm px-0 text-left text-[13px] font-normal whitespace-normal text-inherit hover:bg-transparent hover:text-primary-text aria-pressed:font-bold"
												onClick={() => select(exercise.id)}
												variant="ghost"
											>
												{exercise.name}
											</Button>
										</TableCell>
										<TableCell>{exercise.materials.reagents.length}</TableCell>
										<TableCell>{exercise.materials.equipment.length}</TableCell>
										<TableCell>{exercise.materials.waste.length}</TableCell>
										<TableCell>
											<ActiveBadge active={exercise.active} />
										</TableCell>
									</TableRow>
								);
							})}
							{visible.length === 0 && (
								<TableEmpty colSpan={6}>
									{exercises.length === 0
										? "Aún no hay prácticas. Agrega la primera para definir los materiales de las solicitudes."
										: "Ninguna práctica coincide con la búsqueda."}
								</TableEmpty>
							)}
						</TableBody>
					</Table>
					<Footnote>
						El número es solo una etiqueta y puede repetirse. Las prácticas
						inactivas siguen visibles en las solicitudes que ya las usaron.
					</Footnote>
				</section>

				<Card
					aria-labelledby="exercise-panel-title"
					className="max-w-[460px] flex-[1_1_340px]"
				>
					{!draft && <ActionNotice notice={notice} />}
					{selected ? (
						<ExerciseDetail
							busy={busy}
							exercise={selected}
							onEdit={() => open(draftFrom(selected))}
							onRetire={() => void retire(selected)}
						/>
					) : (
						<EmptyState id="exercise-panel-title">
							{exercises.length === 0
								? "Aún no hay prácticas. Agrega la primera con Nueva práctica."
								: "Elige una práctica para ver sus materiales."}
						</EmptyState>
					)}
				</Card>
			</div>

			{draft && (
				<FormDialog
					busy={busy}
					className="sm:max-w-4xl"
					notice={notice}
					onClose={() => open(null)}
					onSubmit={save}
					submitLabel={draft.id ? "Guardar cambios" : "Crear práctica"}
					title={draft.id ? "Editar práctica" : "Nueva práctica"}
				>
					<ExerciseFields draft={draft} onChange={setDraft} />
				</FormDialog>
			)}
		</Page>
	);
}

function ExerciseDetail({
	exercise,
	busy,
	onEdit,
	onRetire,
}: {
	exercise: LabExercise;
	busy: boolean;
	onEdit: () => void;
	onRetire: () => void;
}) {
	const { reagents, equipment, waste } = exercise.materials;
	return (
		<>
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col">
					<span className="text-[13px] text-muted-foreground">
						Práctica {exercise.number}
					</span>
					<CardTitle className="text-primary-text" id="exercise-panel-title">
						{exercise.name}
					</CardTitle>
				</div>
				<ActiveBadge active={exercise.active} />
			</div>

			<QuantityList items={reagents} title="Reactivos" />
			<QuantityList items={equipment} title="Equipo" />
			<WasteList items={waste} />

			<CardFooter>
				<Button disabled={busy} onClick={onEdit} size="lg">
					Editar práctica
				</Button>
				{exercise.active && (
					<Button
						disabled={busy}
						onClick={onRetire}
						size="lg"
						variant="outline"
					>
						Desactivar
					</Button>
				)}
			</CardFooter>
		</>
	);
}

function ExerciseFields({
	draft,
	onChange,
}: {
	draft: ExerciseDraft;
	onChange: (draft: ExerciseDraft) => void;
}) {
	return (
		<>
			<div className="grid gap-[18px] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
				<Field>
					<FieldLabel htmlFor="exercise-number">Número o etiqueta</FieldLabel>
					<Input
						autoComplete="off"
						id="exercise-number"
						maxLength={60}
						onChange={(event) =>
							onChange({ ...draft, number: event.target.value })
						}
						placeholder="Por ejemplo, 12 o Q-3"
						required
						value={draft.number}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="exercise-name">Nombre</FieldLabel>
					<Input
						autoComplete="off"
						id="exercise-name"
						maxLength={160}
						onChange={(event) =>
							onChange({ ...draft, name: event.target.value })
						}
						placeholder="Por ejemplo, Separación de mezclas"
						required
						value={draft.name}
					/>
				</Field>
			</div>

			<div>
				<h3 className="text-[15px] font-bold">Reactivos</h3>
				<QuantityEditor
					addLabel="Agregar reactivo"
					chemical
					items={draft.reagents}
					kind="reactivo"
					onChange={(reagents) => onChange({ ...draft, reagents })}
				/>
			</div>
			<div>
				<h3 className="text-[15px] font-bold">Equipo</h3>
				<QuantityEditor
					addLabel="Agregar equipo"
					items={draft.equipment}
					kind="equipo"
					onChange={(equipment) => onChange({ ...draft, equipment })}
				/>
			</div>
			<div>
				<h3 className="text-[15px] font-bold">Residuos esperados</h3>
				<WasteEditor
					items={draft.waste}
					onChange={(waste) => onChange({ ...draft, waste })}
				/>
			</div>
		</>
	);
}
