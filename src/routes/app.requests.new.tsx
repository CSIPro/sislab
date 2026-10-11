import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { CalendarDays, CircleCheck, Clock, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { OptionSelect } from "../components/option-select.tsx";
import { Combobox } from "../components/ui/combobox.tsx";
import { DatePicker } from "../components/ui/date-picker.tsx";
import type { QuantityItem, WasteItem } from "../db/schema.ts";
import {
	addDays,
	formatSessionDate,
	groupLabel,
	sessionDateOption,
	sislabNowTime,
	sislabToday,
	timeRange,
	upcomingSessionDates,
} from "../lib/session-dates.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { weekdays } from "../lib/weekdays.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	getPreparationRequestOptionsFn,
	submitPreparationRequestFn,
} from "../server/preparation-request-functions.ts";
import type { RequestCustomization } from "../server/preparation-requests.ts";

const OFFERED_DATES = 3;
/** How far ahead the calendar lets a professor pick another date. */
const CALENDAR_REACH_DAYS = 365;

export const Route = createFileRoute("/app/requests/new")({
	validateSearch: (search: Record<string, unknown>): { group?: string } =>
		typeof search.group === "string" ? { group: search.group } : {},
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("professor"))
			throw redirect({ to: "/app/dashboard" });
		return {
			...(await getPreparationRequestOptionsFn()),
			today: sislabToday(),
			nowTime: sislabNowTime(),
		};
	},
	component: NewPreparationRequestPage,
});

type EditableQuantityItem = QuantityItem & { key: string };
type EditableWasteItem = WasteItem & { key: string };

const emptyQuantity = (): EditableQuantityItem => ({
	key: crypto.randomUUID(),
	name: "",
	amount: 1,
	unit: "",
	basis: "team",
});
const emptyWaste = (): EditableWasteItem => ({
	key: crypto.randomUUID(),
	name: "",
	container: "",
	treatment: "",
});

function NewPreparationRequestPage() {
	const { groups, exercises, minimumNoticeDays, today, nowTime } =
		Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = useNavigate();
	const [groupId, setGroupId] = useState(
		groups.some((group) => group.id === search.group)
			? (search.group ?? "")
			: "",
	);
	const [exerciseId, setExerciseId] = useState("");
	const [sessionDate, setSessionDate] = useState("");
	const [omittedReagents, setOmittedReagents] = useState<string[]>([]);
	const [addedReagents, setAddedReagents] = useState<EditableQuantityItem[]>(
		[],
	);
	const [addedEquipment, setAddedEquipment] = useState<EditableQuantityItem[]>(
		[],
	);
	const [addedWaste, setAddedWaste] = useState<EditableWasteItem[]>([]);
	const [professorNote, setProfessorNote] = useState("");
	const [lateReason, setLateReason] = useState("");
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	const selectedGroup = groups.find((group) => group.id === groupId);
	const selectedExercise = exercises.find(
		(exercise) => exercise.id === exerciseId,
	);
	const dateOptions = selectedGroup
		? upcomingSessionDates({
				weekday: selectedGroup.weekday,
				today,
				nowTime,
				startTime: selectedGroup.startTime,
				minimumNoticeDays,
				count: OFFERED_DATES,
			})
		: [];
	const pickableDate = (date: string) =>
		selectedGroup
			? sessionDateOption({
					date,
					weekday: selectedGroup.weekday,
					today,
					nowTime,
					startTime: selectedGroup.startTime,
					minimumNoticeDays,
				})
			: null;
	const customPicked =
		sessionDate !== "" &&
		!dateOptions.some((option) => option.date === sessionDate);
	const needsLateReason = sessionDate
		? (pickableDate(sessionDate)?.late ?? false)
		: false;
	const materials = selectedExercise?.materials;
	const teams = selectedGroup?.teams ?? 0;
	const totals = [
		...(materials?.reagents.map((item) => ({
			item,
			omitted: omittedReagents.includes(item.name),
		})) ?? []),
		...addedReagents
			.filter((item) => item.name.trim())
			.map((item) => ({ item, omitted: false })),
	];

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedGroup || !selectedExercise || !sessionDate) {
			setMessage("Elige un grupo, una fecha y una práctica para continuar.");
			return;
		}
		setBusy(true);
		setMessage("");
		const customization: RequestCustomization = {
			omittedReagents,
			addedReagents: addedReagents.map(({ key: _key, ...item }) => item),
			addedEquipment: addedEquipment.map(({ key: _key, ...item }) => item),
			addedWaste: addedWaste.map(({ key: _key, ...item }) => item),
			professorNote: professorNote || null,
			lateReason: needsLateReason ? lateReason : null,
		};
		try {
			await submitPreparationRequestFn({
				data: { groupId, exerciseId, sessionDate, customization },
			});
			await navigate({ to: "/app/requests/mine" });
		} catch (error) {
			setMessage(
				userFacingError(
					error,
					"No se pudo enviar tu solicitud. Inténtalo de nuevo más tarde.",
				),
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="app-page">
			<div className="app-page-inner is-narrow">
				<header className="page-head-copy">
					<h1 className="page-title">Nueva solicitud</h1>
					<p className="page-sub">
						Pide al personal de laboratorio que prepare reactivos, equipo y
						manejo de residuos para una práctica de uno de tus grupos.
					</p>
				</header>

				<div className="request-layout">
					<form className="request-form" onSubmit={submit}>
						<fieldset className="request-step">
							<legend className="request-step-title">
								<span aria-hidden="true" className="step-badge">
									1
								</span>
								Elige el grupo
							</legend>
							{groups.length === 0 && (
								<p className="empty-state">
									No tienes grupos activos.{" "}
									<Link to="/app/groups/new">Registra un grupo</Link>
								</p>
							)}
							{groups.map((group) => (
								<label className="option-card" key={group.id}>
									<input
										checked={groupId === group.id}
										name="group"
										onChange={() => {
											setGroupId(group.id);
											setSessionDate("");
										}}
										type="radio"
										value={group.id}
									/>
									<span>
										<strong>
											{group.subjectName} · {groupLabel(group.number)}
										</strong>
										<small>
											{weekdays[group.weekday]},{" "}
											{timeRange(group.startTime, group.endTime)} ·{" "}
											{group.labName}
										</small>
									</span>
								</label>
							))}
						</fieldset>

						<div className="request-step">
							<h2 className="request-step-title">
								<span aria-hidden="true" className="step-badge">
									2
								</span>
								Elige la fecha
							</h2>
							{selectedGroup ? (
								<>
									<p className="request-step-help">
										Solo se ofrecen los {weekdayPlural(selectedGroup.weekday)},
										el día de este grupo.
									</p>
									{/* biome-ignore lint/a11y/useSemanticElements: the step heading already names this group of buttons */}
									<div
										aria-label="Fechas disponibles"
										className="date-options"
										role="group"
									>
										{dateOptions.map(({ date, late }) => (
											<button
												aria-pressed={sessionDate === date}
												className="date-option"
												key={date}
												onClick={() => setSessionDate(date)}
												type="button"
											>
												{formatSessionDate(date, "short")}
												<small>{noticeLabel(late)}</small>
											</button>
										))}
										<DatePicker
											aria-pressed={customPicked}
											className="date-option is-custom"
											footer={`Solo puedes elegir ${weekdayPlural(selectedGroup.weekday)}, el día de este grupo.`}
											isDateDisabled={(date) => !pickableDate(date)}
											max={addDays(today, CALENDAR_REACH_DAYS)}
											min={today}
											onValueChange={setSessionDate}
											value={customPicked ? sessionDate : ""}
										>
											<CalendarDays
												aria-hidden="true"
												size={18}
												strokeWidth={1.75}
											/>
											<span>
												{customPicked
													? formatSessionDate(sessionDate, "short")
													: "Elegir otra fecha"}
												<small>
													{customPicked
														? noticeLabel(needsLateReason)
														: `Solo ${weekdayPlural(selectedGroup.weekday)}`}
												</small>
											</span>
										</DatePicker>
									</div>
								</>
							) : (
								<p className="request-step-help">
									Elige un grupo para ver sus fechas.
								</p>
							)}
							{needsLateReason && (
								<label className="field-label">
									Motivo del aviso corto
									<textarea
										className="field"
										maxLength={1000}
										onChange={(event) => setLateReason(event.target.value)}
										placeholder="Explica por qué solicitas la preparación con poco tiempo."
										required
										value={lateReason}
									/>
									<span className="field-hint">
										El personal de laboratorio decidirá si acepta la solicitud.
									</span>
								</label>
							)}
						</div>

						<div className="request-step">
							<h2 className="request-step-title">
								<span aria-hidden="true" className="step-badge">
									3
								</span>
								Elige la práctica
							</h2>
							<div className="field-label">
								<label htmlFor="request-exercise">
									Práctica de laboratorio
								</label>
								<Combobox
									className="field"
									emptyText="Ninguna práctica coincide."
									id="request-exercise"
									onValueChange={(value) => {
										setExerciseId(value);
										setOmittedReagents([]);
									}}
									options={exercises.map((exercise) => ({
										value: exercise.id,
										label: `${exercise.number} · ${exercise.name}`,
									}))}
									placeholder="Elige una práctica"
									searchPlaceholder="Buscar por número o nombre"
									value={exerciseId}
								/>
							</div>
						</div>

						<div className="request-step">
							<h2 className="request-step-title">
								<span aria-hidden="true" className="step-badge">
									4
								</span>
								Revisa el material
							</h2>
							<p className="request-step-help">
								Desmarca los reactivos que no necesites y quedarán tachados como
								omitidos. Puedes agregar equipo y residuos.
							</p>

							<div>
								<h3 className="material-title">Reactivos</h3>
								{materials?.reagents.map((item) => {
									const omitted = omittedReagents.includes(item.name);
									return (
										<label
											className="material-row"
											key={`${item.name}-${item.amount}-${item.unit}-${item.basis}`}
										>
											<input
												checked={!omitted}
												onChange={() =>
													setOmittedReagents((current) =>
														omitted
															? current.filter((name) => name !== item.name)
															: [...current, item.name],
													)
												}
												type="checkbox"
											/>
											<span
												className={`material-name${omitted ? " is-omitted" : ""}`}
											>
												{item.name}
											</span>
											{omitted && <span className="basis-tag">Omitido</span>}
											<Quantity item={item} omitted={omitted} />
										</label>
									);
								})}
								<QuantityEditor
									addLabel="Agregar reactivo"
									items={addedReagents}
									kind="reactivo"
									onChange={setAddedReagents}
								/>

								<h3 className="material-title">Equipo</h3>
								{materials?.equipment.map((item) => (
									<div
										className="material-row"
										key={`${item.name}-${item.amount}-${item.unit}-${item.basis}`}
									>
										<span className="material-name">{item.name}</span>
										<Quantity item={item} />
									</div>
								))}
								<QuantityEditor
									addLabel="Agregar equipo"
									items={addedEquipment}
									kind="equipo"
									onChange={setAddedEquipment}
								/>

								<h3 className="material-title">Residuos esperados</h3>
								{materials?.waste.map((item) => (
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
								<WasteEditor items={addedWaste} onChange={setAddedWaste} />
							</div>
						</div>

						<label className="field-label">
							Nota para el personal (opcional)
							<textarea
								className="field"
								maxLength={2000}
								onChange={(event) => setProfessorNote(event.target.value)}
								placeholder="Por ejemplo: necesito las buretas limpias desde las 16:30."
								value={professorNote}
							/>
						</label>

						{message && (
							<p className="notice notice-error" role="alert">
								{message}
							</p>
						)}

						<div className="request-actions">
							<button className="button-primary" disabled={busy} type="submit">
								{busy ? "Enviando…" : "Enviar solicitud"}
							</button>
							<Link className="button-secondary" to="/app/dashboard">
								Cancelar
							</Link>
						</div>
					</form>

					<aside
						aria-labelledby="request-summary-title"
						className="request-summary"
					>
						<section className="panel">
							<h2 id="request-summary-title">Resumen</h2>
							<dl className="kv">
								<div>
									<dt>Grupo</dt>
									<dd className="is-strong">
										{selectedGroup
											? `${selectedGroup.subjectName} · ${groupLabel(selectedGroup.number)}`
											: "Elige un grupo"}
									</dd>
								</div>
								<div>
									<dt>Fecha y hora</dt>
									<dd>
										{selectedGroup && sessionDate
											? `${formatSessionDate(sessionDate, "long")}, ${timeRange(selectedGroup.startTime, selectedGroup.endTime)}`
											: "Elige una fecha"}
									</dd>
								</div>
								<div>
									<dt>Laboratorio</dt>
									<dd>{selectedGroup?.labName ?? "—"}</dd>
								</div>
								<div>
									<dt>Práctica</dt>
									<dd>
										{selectedExercise
											? `${selectedExercise.number} · ${selectedExercise.name}`
											: "Elige una práctica"}
									</dd>
								</div>
							</dl>
							{selectedGroup && totals.length > 0 && (
								<div className="summary-totals">
									<h3>Cantidades calculadas</h3>
									<p>
										{teams} {teams === 1 ? "equipo" : "equipos"} en el grupo.
									</p>
									<ul className="mono">
										{totals.map(({ item, omitted }) => (
											<li
												className={omitted ? "is-omitted" : undefined}
												key={`${item.name}-${item.unit}-${item.basis}`}
											>
												<span>{item.name}</span>
												<strong>
													{item.amount * (item.basis === "team" ? teams : 1)}{" "}
													{item.unit}
												</strong>
											</li>
										))}
									</ul>
								</div>
							)}
						</section>

						{sessionDate &&
							(needsLateReason ? (
								<section className="notice notice-warning">
									<Clock aria-hidden="true" size={20} strokeWidth={2} />
									<p>
										<strong>
											Menos de {noticeDays(minimumNoticeDays)} de aviso.
										</strong>{" "}
										Explica el motivo. El personal de laboratorio decidirá si
										acepta la solicitud.
									</p>
								</section>
							) : (
								<section className="notice notice-accent">
									<CircleCheck aria-hidden="true" size={20} strokeWidth={2} />
									<p>
										<strong>
											Cumple el aviso mínimo de {noticeDays(minimumNoticeDays)}.
										</strong>{" "}
										Si eliges una fecha más cercana, tendrás que explicar el
										motivo y el personal decidirá si la acepta.
									</p>
								</section>
							))}

						<p className="footnote">
							Al enviar se guarda una copia de estos datos. Si después cambias
							la práctica o el grupo, esta solicitud no se modifica.
						</p>
					</aside>
				</div>
			</div>
		</main>
	);
}

function weekdayPlural(weekday: number) {
	const name = weekdays[weekday].toLocaleLowerCase("es-MX");
	return name.endsWith("s") ? name : `${name}s`;
}

function noticeLabel(late: boolean) {
	return late ? "Último momento" : "A tiempo";
}

function noticeDays(days: number) {
	return `${days} ${days === 1 ? "día" : "días"}`;
}

function Quantity({
	item,
	omitted = false,
}: {
	item: QuantityItem;
	omitted?: boolean;
}) {
	const strike = omitted ? " is-omitted" : "";
	return (
		<>
			<span className={`mono${strike}`}>
				{item.amount} {item.unit}
			</span>
			<span className={`basis-tag${strike}`}>
				{item.basis === "team" ? "por equipo" : "por grupo"}
			</span>
		</>
	);
}

const basisOptions = [
	["team", "Por equipo"],
	["group", "Por grupo"],
] as const;

function QuantityEditor({
	addLabel,
	kind,
	items,
	onChange,
}: {
	addLabel: string;
	kind: string;
	items: EditableQuantityItem[];
	onChange: (items: EditableQuantityItem[]) => void;
}) {
	const change = (index: number, patch: Partial<QuantityItem>) =>
		onChange(
			items.map((item, itemIndex) =>
				itemIndex === index ? { ...item, ...patch } : item,
			),
		);
	return (
		<>
			{items.map((item, index) => (
				<div className="material-editor" key={item.key}>
					<input
						aria-label={`Nombre del ${kind}`}
						className="field-outline is-wide"
						onChange={(event) => change(index, { name: event.target.value })}
						placeholder="Nombre"
						required
						value={item.name}
					/>
					<input
						aria-label={`Cantidad del ${kind}`}
						className="field-outline"
						min="0.01"
						onChange={(event) =>
							change(index, { amount: Number(event.target.value) })
						}
						required
						step="any"
						type="number"
						value={item.amount}
					/>
					<input
						aria-label={`Unidad del ${kind}`}
						className="field-outline"
						onChange={(event) => change(index, { unit: event.target.value })}
						placeholder="Unidad"
						required
						value={item.unit}
					/>
					<OptionSelect
						aria-label={`Base del ${kind}`}
						onValueChange={(value) =>
							change(index, { basis: value as QuantityItem["basis"] })
						}
						options={basisOptions}
						value={item.basis}
					/>
					<button
						className="button-secondary button-sm"
						onClick={() =>
							onChange(items.filter((_, itemIndex) => index !== itemIndex))
						}
						type="button"
					>
						Quitar
					</button>
				</div>
			))}
			<div>
				<button
					className="button-text"
					onClick={() => onChange([...items, emptyQuantity()])}
					type="button"
				>
					<Plus aria-hidden="true" size={16} strokeWidth={2} />
					{addLabel}
				</button>
			</div>
		</>
	);
}

const wasteFields = [
	["name", "Nombre del residuo", "Residuo"],
	["container", "Contenedor del residuo", "Contenedor"],
	["treatment", "Tratamiento del residuo", "Tratamiento"],
] as const;

function WasteEditor({
	items,
	onChange,
}: {
	items: EditableWasteItem[];
	onChange: (items: EditableWasteItem[]) => void;
}) {
	return (
		<>
			{items.map((item, index) => (
				<div className="material-editor" key={item.key}>
					{wasteFields.map(([key, label, placeholder]) => (
						<input
							aria-label={label}
							className="field-outline"
							key={key}
							onChange={(event) =>
								onChange(
									items.map((current, itemIndex) =>
										itemIndex === index
											? { ...current, [key]: event.target.value }
											: current,
									),
								)
							}
							placeholder={placeholder}
							required
							value={item[key]}
						/>
					))}
					<button
						className="button-secondary button-sm"
						onClick={() =>
							onChange(items.filter((_, itemIndex) => index !== itemIndex))
						}
						type="button"
					>
						Quitar
					</button>
				</div>
			))}
			<div>
				<button
					className="button-text"
					onClick={() => onChange([...items, emptyWaste()])}
					type="button"
				>
					<Plus aria-hidden="true" size={16} strokeWidth={2} />
					Agregar residuo
				</button>
			</div>
		</>
	);
}
