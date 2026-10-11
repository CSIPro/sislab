import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus, Save, Trash2, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type {
	ExerciseMaterials,
	QuantityItem,
	WasteItem,
} from "../db/schema.ts";
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
	materials: {
		reagents: QuantityDraft[];
		equipment: QuantityDraft[];
		waste: WasteDraft[];
	};
};

const emptyDraft = (): ExerciseDraft => ({
	id: null,
	number: "",
	name: "",
	materials: { reagents: [], equipment: [], waste: [] },
});

function draftFrom(exercise: LabExercise): ExerciseDraft {
	return {
		id: exercise.id,
		number: exercise.number,
		name: exercise.name,
		materials: {
			reagents: exercise.materials.reagents.map((item) => ({
				...item,
				amount: String(item.amount),
				key: crypto.randomUUID(),
			})),
			equipment: exercise.materials.equipment.map((item) => ({
				...item,
				amount: String(item.amount),
				key: crypto.randomUUID(),
			})),
			waste: exercise.materials.waste.map((item) => ({
				...item,
				key: crypto.randomUUID(),
			})),
		},
	};
}

function LabExercisesPage() {
	const initial = Route.useLoaderData();
	const [exercises, setExercises] = useState(initial);
	const [draft, setDraft] = useState<ExerciseDraft>(emptyDraft);
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);

	async function refresh() {
		setExercises(await listLabExercisesFn());
	}

	function edit(exercise: LabExercise) {
		setDraft(draftFrom(exercise));
		setMessage("");
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	function addQuantity(kind: "reagents" | "equipment") {
		setDraft((current) => ({
			...current,
			materials: {
				...current.materials,
				[kind]: [
					...current.materials[kind],
					{
						name: "",
						amount: "",
						unit: "",
						basis: "team",
						key: crypto.randomUUID(),
					},
				],
			},
		}));
	}

	function updateQuantity<K extends keyof QuantityDraft>(
		kind: "reagents" | "equipment",
		index: number,
		field: K,
		value: QuantityDraft[K],
	) {
		setDraft((current) => ({
			...current,
			materials: {
				...current.materials,
				[kind]: current.materials[kind].map((item, itemIndex) =>
					itemIndex === index ? { ...item, [field]: value } : item,
				),
			},
		}));
	}

	function removeItem(kind: keyof ExerciseMaterials, index: number) {
		setDraft((current) => ({
			...current,
			materials: {
				...current.materials,
				[kind]: current.materials[kind].filter(
					(_, itemIndex) => itemIndex !== index,
				),
			},
		}));
	}

	function addWaste() {
		setDraft((current) => ({
			...current,
			materials: {
				...current.materials,
				waste: [
					...current.materials.waste,
					{ name: "", container: "", treatment: "", key: crypto.randomUUID() },
				],
			},
		}));
	}

	function updateWaste(index: number, field: keyof WasteItem, value: string) {
		setDraft((current) => ({
			...current,
			materials: {
				...current.materials,
				waste: current.materials.waste.map((item, itemIndex) =>
					itemIndex === index ? { ...item, [field]: value } : item,
				),
			},
		}));
	}

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setMessage("");
		const input = {
			number: draft.number,
			name: draft.name,
			materials: {
				reagents: toQuantityItems(draft.materials.reagents),
				equipment: toQuantityItems(draft.materials.equipment),
				waste: draft.materials.waste.map(({ key: _key, ...item }) => item),
			},
		};
		try {
			if (draft.id) {
				await updateLabExerciseFn({ data: { id: draft.id, ...input } });
				setMessage(
					"Se actualizó el ejercicio. Las solicitudes anteriores conservaron sus materiales.",
				);
			} else {
				await createLabExerciseFn({ data: input });
				setMessage("Se creó el ejercicio.");
			}
			await refresh();
			setDraft(emptyDraft());
		} catch (error) {
			setMessage(userFacingError(error, "No se pudo guardar el ejercicio."));
		} finally {
			setBusy(false);
		}
	}

	async function retire(exercise: LabExercise) {
		if (
			!window.confirm(
				`¿Retirar “${exercise.name}”? Ya no estará disponible para solicitudes nuevas.`,
			)
		)
			return;
		setBusy(true);
		setMessage("");
		try {
			await retireLabExerciseFn({ data: { id: exercise.id } });
			await refresh();
			if (draft.id === exercise.id) setDraft(emptyDraft());
			setMessage(
				"Se retiró el ejercicio. Las solicitudes anteriores conservaron sus materiales.",
			);
		} catch (error) {
			setMessage(userFacingError(error, "No se pudo retirar el ejercicio."));
		} finally {
			setBusy(false);
		}
	}

	function cancelEdit() {
		setDraft(emptyDraft());
		setMessage("");
	}

	return (
		<main className="dashboard-page">
			<header className="dashboard-intro">
				<div>
					<h1>Ejercicios de laboratorio</h1>
					<p>
						Define los materiales que el profesorado puede incluir en nuevas
						solicitudes.
					</p>
				</div>
			</header>

			<form className="dashboard-panel grid gap-6" onSubmit={save}>
				<div className="dashboard-panel-heading">
					<div>
						<h2>{draft.id ? "Editar ejercicio" : "Nuevo ejercicio"}</h2>
						<p>El número funciona como etiqueta y puede repetirse.</p>
					</div>
					{draft.id && (
						<button
							className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
							disabled={busy}
							onClick={cancelEdit}
							type="button"
						>
							<X aria-hidden="true" size={16} /> Cancelar edición
						</button>
					)}
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<label className="grid gap-1 text-sm font-semibold">
						Número o etiqueta
						<input
							autoComplete="off"
							maxLength={60}
							name="number"
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									number: event.target.value,
								}))
							}
							placeholder="Ej. 12 o Q-3"
							required
							value={draft.number}
						/>
					</label>
					<label className="grid gap-1 text-sm font-semibold">
						Nombre
						<input
							autoComplete="off"
							maxLength={160}
							name="name"
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									name: event.target.value,
								}))
							}
							placeholder="Ej. Separación de mezclas"
							required
							value={draft.name}
						/>
					</label>
				</div>

				<MaterialSection
					title="Reactivos"
					description="Cantidad por equipo o por grupo."
					onAdd={() => addQuantity("reagents")}
				>
					{draft.materials.reagents.map((item, index) => (
						<QuantityRow
							key={item.key}
							item={item}
							index={index}
							kind="reagents"
							onChange={updateQuantity}
							onRemove={() => removeItem("reagents", index)}
						/>
					))}
				</MaterialSection>
				<MaterialSection
					title="Equipo"
					description="Cantidad por equipo o por grupo."
					onAdd={() => addQuantity("equipment")}
				>
					{draft.materials.equipment.map((item, index) => (
						<QuantityRow
							key={item.key}
							item={item}
							index={index}
							kind="equipment"
							onChange={updateQuantity}
							onRemove={() => removeItem("equipment", index)}
						/>
					))}
				</MaterialSection>
				<MaterialSection
					title="Residuos"
					description="Indica el recipiente y el tratamiento esperado."
					onAdd={addWaste}
				>
					{draft.materials.waste.map((item, index) => (
						<div
							className="grid gap-3 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto]"
							key={item.key}
						>
							<label className="grid gap-1 text-xs font-semibold">
								Residuo
								<input
									aria-label={`Residuo ${index + 1}`}
									onChange={(event) =>
										updateWaste(index, "name", event.target.value)
									}
									placeholder="Nombre"
									required
									value={item.name}
								/>
							</label>
							<label className="grid gap-1 text-xs font-semibold">
								Recipiente
								<input
									aria-label={`Recipiente de residuo ${index + 1}`}
									onChange={(event) =>
										updateWaste(index, "container", event.target.value)
									}
									placeholder="Ej. Contenedor para orgánicos"
									required
									value={item.container}
								/>
							</label>
							<label className="grid gap-1 text-xs font-semibold">
								Tratamiento
								<input
									aria-label={`Tratamiento de residuo ${index + 1}`}
									onChange={(event) =>
										updateWaste(index, "treatment", event.target.value)
									}
									placeholder="Instrucciones de manejo"
									required
									value={item.treatment}
								/>
							</label>
							<RemoveButton
								label={`Quitar residuo ${index + 1}`}
								onClick={() => removeItem("waste", index)}
							/>
						</div>
					))}
				</MaterialSection>

				<div className="flex flex-wrap items-center gap-3">
					<button
						className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
						disabled={busy}
						type="submit"
					>
						<Save aria-hidden="true" size={17} />
						{draft.id ? "Guardar cambios" : "Crear ejercicio"}
					</button>
					{draft.id && (
						<button
							className="rounded-lg border border-[var(--border)] px-5 py-2.5 font-semibold"
							disabled={busy}
							onClick={cancelEdit}
							type="button"
						>
							Cancelar
						</button>
					)}
				</div>
				{message && <output className="m-0 text-sm">{message}</output>}
			</form>

			<section
				className="dashboard-panel"
				aria-labelledby="exercise-list-title"
			>
				<div className="dashboard-panel-heading">
					<div>
						<h2 id="exercise-list-title">Ejercicios registrados</h2>
						<p>
							{exercises.filter(({ active }) => active).length} disponibles ·{" "}
							{exercises.length} en total
						</p>
					</div>
				</div>
				{exercises.length === 0 ? (
					<div className="dashboard-empty-state">
						<p>Aún no hay ejercicios registrados.</p>
						<p>
							Agrega el primero para definir los materiales de las solicitudes.
						</p>
					</div>
				) : (
					<ul className="mt-3 divide-y divide-[var(--border)] p-0">
						{exercises.map((exercise) => (
							<li
								className="flex flex-wrap items-center justify-between gap-4 py-4"
								key={exercise.id}
							>
								<div className="grid gap-1">
									<div className="flex flex-wrap items-center gap-2">
										<span className="rounded-md bg-[var(--muted)] px-2 py-1 font-mono text-sm font-semibold">
											{exercise.number}
										</span>
										<strong>{exercise.name}</strong>
										{!exercise.active && (
											<span className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
												Retirado
											</span>
										)}
									</div>
									<p className="m-0 text-sm text-[var(--muted-foreground)]">
										{exercise.materials.reagents.length} reactivos ·{" "}
										{exercise.materials.equipment.length} equipos ·{" "}
										{exercise.materials.waste.length} residuos
									</p>
								</div>
								<div className="flex items-center gap-2">
									<button
										className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
										disabled={busy}
										onClick={() => edit(exercise)}
										type="button"
									>
										Editar
									</button>
									{exercise.active && (
										<button
											className="inline-flex items-center gap-1 rounded-lg border border-[var(--destructive)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"
											disabled={busy}
											onClick={() => retire(exercise)}
											type="button"
										>
											<Trash2 aria-hidden="true" size={15} />
											Retirar
										</button>
									)}
									{!exercise.active && (
										<span className="sr-only">
											Este ejercicio está retirado.
										</span>
									)}
								</div>
							</li>
						))}
					</ul>
				)}
			</section>
		</main>
	);
}

function toQuantityItems(items: QuantityDraft[]): QuantityItem[] {
	return items.map(({ key: _key, ...item }) => ({
		...item,
		amount: Number(item.amount),
	}));
}

function MaterialSection({
	title,
	description,
	onAdd,
	children,
}: {
	title: string;
	description: string;
	onAdd: () => void;
	children: ReactNode;
}) {
	return (
		<section className="grid gap-3" aria-label={title}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h3 className="m-0 text-base font-bold">{title}</h3>
					<p className="m-0 text-sm text-[var(--muted-foreground)]">
						{description}
					</p>
				</div>
				<button
					className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
					onClick={onAdd}
					type="button"
				>
					<Plus aria-hidden="true" size={16} />
					Agregar
				</button>
			</div>
			<div className="grid gap-3">{children}</div>
		</section>
	);
}

function QuantityRow({
	item,
	index,
	kind,
	onChange,
	onRemove,
}: {
	item: QuantityDraft;
	index: number;
	kind: "reagents" | "equipment";
	onChange: <K extends keyof QuantityDraft>(
		kind: "reagents" | "equipment",
		index: number,
		field: K,
		value: QuantityDraft[K],
	) => void;
	onRemove: () => void;
}) {
	const label = kind === "reagents" ? "reactivo" : "equipo";
	return (
		<div className="grid gap-3 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-[1.5fr_.8fr_.8fr_1fr_auto]">
			<label className="grid gap-1 text-xs font-semibold">
				{kind === "reagents" ? "Reactivo" : "Equipo"}
				<input
					aria-label={`${kind === "reagents" ? "Reactivo" : "Equipo"} ${index + 1}`}
					onChange={(event) =>
						onChange(kind, index, "name", event.target.value)
					}
					placeholder="Nombre"
					required
					value={item.name}
				/>
			</label>
			<label className="grid gap-1 text-xs font-semibold">
				Cantidad
				<input
					aria-label={`Cantidad de ${label} ${index + 1}`}
					min="0.000001"
					onChange={(event) =>
						onChange(kind, index, "amount", event.target.value)
					}
					required
					step="any"
					type="number"
					value={item.amount}
				/>
			</label>
			<label className="grid gap-1 text-xs font-semibold">
				Unidad
				<input
					aria-label={`Unidad de ${label} ${index + 1}`}
					onChange={(event) =>
						onChange(kind, index, "unit", event.target.value)
					}
					placeholder="g, ml, pieza"
					required
					value={item.unit}
				/>
			</label>
			<label className="grid gap-1 text-xs font-semibold">
				Base
				<select
					aria-label={`Base de cantidad para ${label} ${index + 1}`}
					onChange={(event) =>
						onChange(
							kind,
							index,
							"basis",
							event.target.value as QuantityDraft["basis"],
						)
					}
					value={item.basis}
				>
					<option value="team">Por equipo</option>
					<option value="group">Por grupo</option>
				</select>
			</label>
			<RemoveButton label={`Quitar ${label} ${index + 1}`} onClick={onRemove} />
		</div>
	);
}

function RemoveButton({
	label,
	onClick,
}: {
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			aria-label={label}
			className="self-end rounded-lg border border-[var(--border)] p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
			onClick={onClick}
			type="button"
		>
			<Trash2 aria-hidden="true" size={17} />
		</button>
	);
}
