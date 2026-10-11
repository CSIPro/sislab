import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { OptionSelect } from "../components/option-select.tsx";
import { TableShell } from "../components/table-shell.tsx";
import type { QuantityItem, WasteItem } from "../db/schema.ts";
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

type QuantityDraft = Omit<QuantityItem, "amount"> & {
	amount: string;
	key: string;
};
type WasteDraft = WasteItem & { key: string };
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

const quantityDrafts = (items: QuantityItem[]): QuantityDraft[] =>
	items.map((item) => ({
		...item,
		amount: String(item.amount),
		key: crypto.randomUUID(),
	}));

const draftFrom = (exercise: LabExercise): ExerciseDraft => ({
	id: exercise.id,
	number: exercise.number,
	name: exercise.name,
	reagents: quantityDrafts(exercise.materials.reagents),
	equipment: quantityDrafts(exercise.materials.equipment),
	waste: exercise.materials.waste.map((item) => ({
		...item,
		key: crypto.randomUUID(),
	})),
});

const quantityItems = (items: QuantityDraft[]): QuantityItem[] =>
	items.map(({ key: _key, ...item }) => ({
		...item,
		amount: Number(item.amount),
	}));

function LabExercisesPage() {
	const initial = Route.useLoaderData();
	const [exercises, setExercises] = useState(initial);
	const [selectedId, setSelectedId] = useState(
		(initial.find(({ active }) => active) ?? initial[0])?.id ?? null,
	);
	/** The form replaces the detail panel while a draft is open. */
	const [draft, setDraft] = useState<ExerciseDraft | null>(
		initial.length === 0 ? emptyDraft : null,
	);
	const [search, setSearch] = useState("");
	const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
		null,
	);
	const [busy, setBusy] = useState(false);

	const query = searchable(search.trim());
	const visible = exercises.filter((exercise) =>
		searchable(`${exercise.number} ${exercise.name}`).includes(query),
	);
	const selected = exercises.find(({ id }) => id === selectedId) ?? null;

	function select(exerciseId: string) {
		setSelectedId(exerciseId);
		setDraft(null);
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
				waste: draft.waste.map(({ key: _key, ...item }) => item),
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
		<main className="app-page">
			<div className="app-page-inner is-compact">
				<header className="page-head">
					<div className="page-head-copy">
						<h1 className="page-title">Prácticas</h1>
						<p className="page-sub">
							Catálogo de prácticas de laboratorio. Cada grupo puede solicitar
							cualquiera de las activas.
						</p>
					</div>
					<button
						className="button-primary"
						onClick={() => {
							setDraft(emptyDraft());
							setNotice(null);
						}}
						type="button"
					>
						<Plus aria-hidden="true" size={18} strokeWidth={2} />
						Nueva práctica
					</button>
				</header>

				<div className="split is-top">
					<section className="stack-section min-w-0 flex-[1.5_1_520px]">
						<label className="field-label max-w-[360px]">
							Buscar
							<input
								className="field-outline"
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Nombre o número de práctica"
								type="search"
								value={search}
							/>
						</label>
						<TableShell>
							<table className="data-table" style={{ minWidth: 620 }}>
								<thead>
									<tr>
										<th scope="col">N.º</th>
										<th scope="col">Práctica</th>
										<th scope="col">Reactivos</th>
										<th scope="col">Equipo</th>
										<th scope="col">Residuos</th>
										<th scope="col">Estado</th>
									</tr>
								</thead>
								<tbody>
									{visible.map((exercise) => {
										const isSelected = !draft && exercise.id === selectedId;
										return (
											<tr
												className={
													[
														isSelected && "is-selected",
														!exercise.active && "is-void",
													]
														.filter(Boolean)
														.join(" ") || undefined
												}
												key={exercise.id}
											>
												<td>{exercise.number}</td>
												<td>
													<button
														aria-pressed={isSelected}
														className="row-button"
														onClick={() => select(exercise.id)}
														type="button"
													>
														{isSelected ? (
															<strong>{exercise.name}</strong>
														) : (
															exercise.name
														)}
													</button>
												</td>
												<td>{exercise.materials.reagents.length}</td>
												<td>{exercise.materials.equipment.length}</td>
												<td>{exercise.materials.waste.length}</td>
												<td>
													<StatusChip active={exercise.active} />
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
							{visible.length === 0 && (
								<p className="table-empty">
									{exercises.length === 0
										? "Aún no hay prácticas. Agrega la primera para definir los materiales de las solicitudes."
										: "Ninguna práctica coincide con la búsqueda."}
								</p>
							)}
						</TableShell>
						<p className="footnote">
							El número es solo una etiqueta y puede repetirse. Las prácticas
							inactivas siguen visibles en las solicitudes que ya las usaron.
						</p>
					</section>

					<section
						aria-labelledby="exercise-panel-title"
						className="panel max-w-[460px] flex-[1_1_340px]"
					>
						{notice && (
							<output
								aria-live="polite"
								className={`notice ${notice.error ? "notice-error" : "notice-accent"}`}
							>
								{notice.text}
							</output>
						)}
						{draft ? (
							<ExerciseForm
								busy={busy}
								draft={draft}
								onCancel={() => setDraft(null)}
								onChange={setDraft}
								onSubmit={save}
							/>
						) : selected ? (
							<ExerciseDetail
								busy={busy}
								exercise={selected}
								onEdit={() => {
									setDraft(draftFrom(selected));
									setNotice(null);
								}}
								onRetire={() => void retire(selected)}
							/>
						) : (
							<p className="empty-state" id="exercise-panel-title">
								Elige una práctica para ver sus materiales.
							</p>
						)}
					</section>
				</div>
			</div>
		</main>
	);
}

function StatusChip({ active }: { active: boolean }) {
	return (
		<span className={`chip ${active ? "chip-ok" : "chip-off"}`}>
			{active ? "Activa" : "Inactiva"}
		</span>
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
					<h2
						className="m-0 text-[22px] font-bold text-primary-text"
						id="exercise-panel-title"
					>
						{exercise.name}
					</h2>
				</div>
				<StatusChip active={exercise.active} />
			</div>

			<QuantityList items={reagents} title="Reactivos" />
			<QuantityList items={equipment} title="Equipo" />
			<div>
				<h3 className="detail-title">Residuos esperados</h3>
				{waste.length === 0 && <p className="request-step-help">Ninguno.</p>}
				{waste.map((item) => (
					<div
						className="material-row is-top"
						key={`${item.name}-${item.container}-${item.treatment}`}
					>
						<span className="material-name">
							{item.name}
							<small>
								{item.container} · {item.treatment}
							</small>
						</span>
					</div>
				))}
			</div>

			<div className="panel-actions">
				<button
					className="button-primary"
					disabled={busy}
					onClick={onEdit}
					type="button"
				>
					Editar práctica
				</button>
				{exercise.active && (
					<button
						className="button-secondary"
						disabled={busy}
						onClick={onRetire}
						type="button"
					>
						Desactivar
					</button>
				)}
			</div>
		</>
	);
}

function QuantityList({
	title,
	items,
}: {
	title: string;
	items: QuantityItem[];
}) {
	return (
		<div>
			<h3 className="detail-title">{title}</h3>
			{items.length === 0 && <p className="request-step-help">Ninguno.</p>}
			{items.map((item) => (
				<div
					className="material-row"
					key={`${item.name}-${item.amount}-${item.unit}-${item.basis}`}
				>
					<span className="material-name">{item.name}</span>
					<span className="mono">
						{item.amount} {item.unit}
					</span>
					<span className="basis-tag">
						{item.basis === "team" ? "por equipo" : "por grupo"}
					</span>
				</div>
			))}
		</div>
	);
}

function ExerciseForm({
	draft,
	busy,
	onChange,
	onSubmit,
	onCancel,
}: {
	draft: ExerciseDraft;
	busy: boolean;
	onChange: (draft: ExerciseDraft) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onCancel: () => void;
}) {
	return (
		<form className="flex flex-col gap-[18px]" onSubmit={onSubmit}>
			<h2 className="m-0 text-xl font-bold" id="exercise-panel-title">
				{draft.id ? "Editar práctica" : "Nueva práctica"}
			</h2>
			<label className="field-label">
				Número o etiqueta
				<input
					autoComplete="off"
					className="field-outline"
					maxLength={60}
					onChange={(event) =>
						onChange({ ...draft, number: event.target.value })
					}
					placeholder="Por ejemplo, 12 o Q-3"
					required
					value={draft.number}
				/>
			</label>
			<label className="field-label">
				Nombre
				<input
					autoComplete="off"
					className="field-outline"
					maxLength={160}
					onChange={(event) => onChange({ ...draft, name: event.target.value })}
					placeholder="Por ejemplo, Separación de mezclas"
					required
					value={draft.name}
				/>
			</label>

			<QuantityEditor
				addLabel="Agregar reactivo"
				items={draft.reagents}
				kind="reactivo"
				onChange={(reagents) => onChange({ ...draft, reagents })}
				title="Reactivos"
			/>
			<QuantityEditor
				addLabel="Agregar equipo"
				items={draft.equipment}
				kind="equipo"
				onChange={(equipment) => onChange({ ...draft, equipment })}
				title="Equipo"
			/>
			<WasteEditor
				items={draft.waste}
				onChange={(waste) => onChange({ ...draft, waste })}
			/>

			<div className="panel-actions">
				<button className="button-primary" disabled={busy} type="submit">
					{draft.id ? "Guardar cambios" : "Crear práctica"}
				</button>
				<button
					className="button-secondary"
					disabled={busy}
					onClick={onCancel}
					type="button"
				>
					Cancelar
				</button>
			</div>
		</form>
	);
}

const basisOptions = [
	["team", "Por equipo"],
	["group", "Por grupo"],
] as const;

function QuantityEditor({
	title,
	addLabel,
	kind,
	items,
	onChange,
}: {
	title: string;
	addLabel: string;
	kind: string;
	items: QuantityDraft[];
	onChange: (items: QuantityDraft[]) => void;
}) {
	const change = (index: number, patch: Partial<QuantityDraft>) =>
		onChange(
			items.map((item, itemIndex) =>
				itemIndex === index ? { ...item, ...patch } : item,
			),
		);
	return (
		<div>
			<h3 className="detail-title">{title}</h3>
			{items.map((item, index) => (
				<div className="material-editor" key={item.key}>
					<input
						aria-label={`Nombre del ${kind} ${index + 1}`}
						className="field-outline is-wide"
						onChange={(event) => change(index, { name: event.target.value })}
						placeholder="Nombre"
						required
						value={item.name}
					/>
					<input
						aria-label={`Cantidad del ${kind} ${index + 1}`}
						className="field-outline"
						min="0.000001"
						onChange={(event) => change(index, { amount: event.target.value })}
						placeholder="Cantidad"
						required
						step="any"
						type="number"
						value={item.amount}
					/>
					<input
						aria-label={`Unidad del ${kind} ${index + 1}`}
						className="field-outline"
						onChange={(event) => change(index, { unit: event.target.value })}
						placeholder="g, mL, pza"
						required
						value={item.unit}
					/>
					<OptionSelect
						aria-label={`Base del ${kind} ${index + 1}`}
						onValueChange={(value) =>
							change(index, { basis: value as QuantityItem["basis"] })
						}
						options={basisOptions}
						value={item.basis}
					/>
					<button
						aria-label={`Quitar ${kind} ${index + 1}`}
						className="button-secondary button-sm"
						onClick={() =>
							onChange(items.filter((_, itemIndex) => itemIndex !== index))
						}
						type="button"
					>
						Quitar
					</button>
				</div>
			))}
			<button
				className="button-text"
				onClick={() =>
					onChange([
						...items,
						{
							name: "",
							amount: "",
							unit: "",
							basis: "team",
							key: crypto.randomUUID(),
						},
					])
				}
				type="button"
			>
				<Plus aria-hidden="true" size={16} strokeWidth={2} />
				{addLabel}
			</button>
		</div>
	);
}

const wasteFields = [
	["name", "Residuo", "Nombre"],
	["container", "Contenedor del residuo", "Contenedor"],
	["treatment", "Tratamiento del residuo", "Tratamiento"],
] as const;

function WasteEditor({
	items,
	onChange,
}: {
	items: WasteDraft[];
	onChange: (items: WasteDraft[]) => void;
}) {
	return (
		<div>
			<h3 className="detail-title">Residuos esperados</h3>
			{items.map((item, index) => (
				<div className="material-editor" key={item.key}>
					{wasteFields.map(([field, label, placeholder]) => (
						<input
							aria-label={`${label} ${index + 1}`}
							className="field-outline"
							key={field}
							onChange={(event) =>
								onChange(
									items.map((current, itemIndex) =>
										itemIndex === index
											? { ...current, [field]: event.target.value }
											: current,
									),
								)
							}
							placeholder={placeholder}
							required
							value={item[field]}
						/>
					))}
					<button
						aria-label={`Quitar residuo ${index + 1}`}
						className="button-secondary button-sm"
						onClick={() =>
							onChange(items.filter((_, itemIndex) => itemIndex !== index))
						}
						type="button"
					>
						Quitar
					</button>
				</div>
			))}
			<button
				className="button-text"
				onClick={() =>
					onChange([
						...items,
						{
							name: "",
							container: "",
							treatment: "",
							key: crypto.randomUUID(),
						},
					])
				}
				type="button"
			>
				<Plus aria-hidden="true" size={16} strokeWidth={2} />
				Agregar residuo
			</button>
		</div>
	);
}
