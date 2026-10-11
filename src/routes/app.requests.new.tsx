import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import type { QuantityItem, WasteItem } from "../db/schema.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	getPreparationRequestOptionsFn,
	submitPreparationRequestFn,
} from "../server/preparation-request-functions.ts";
import type { RequestCustomization } from "../server/preparation-requests.ts";

export const Route = createFileRoute("/app/requests/new")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("professor"))
			throw redirect({ to: "/app/dashboard" });
		return getPreparationRequestOptionsFn();
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
	const { groups, exercises, minimumNoticeDays } = Route.useLoaderData();
	const navigate = useNavigate();
	const [step, setStep] = useState(0);
	const [groupId, setGroupId] = useState("");
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
	const today = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Hermosillo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
	const daysAhead = sessionDate
		? Math.floor(
				(Date.parse(`${sessionDate}T12:00:00Z`) -
					Date.parse(`${today}T12:00:00Z`)) /
					86_400_000,
			)
		: Infinity;
	const needsLateReason = daysAhead < minimumNoticeDays;
	const exerciseMaterials = selectedExercise?.materials;

	function continueFromSession(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMessage("");
		if (
			!selectedGroup ||
			!selectedExercise ||
			!isEligibleDate(
				selectedGroup.weekday,
				sessionDate,
				today,
				selectedGroup.startTime,
			)
		) {
			setMessage(
				"Elige un grupo, un ejercicio y una fecha disponible para continuar.",
			);
			return;
		}
		setMessage("");
		setStep(1);
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedGroup || !selectedExercise || !sessionDate) return;
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
					error instanceof Error
						? error.message
						: "No se pudo enviar tu solicitud.",
				),
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="page-wrap px-4 py-10 sm:py-12">
			<section className="island-shell mx-auto max-w-[600px] rounded-2xl p-5 sm:p-8">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="display-title text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
							Nueva solicitud
						</h1>
						<p className="mt-2 text-[var(--muted-foreground)]">
							Indica el grupo, ejercicio y fecha; después revisa los materiales
							antes de enviar.
						</p>
					</div>
					<Link
						className="font-semibold text-[var(--primary-text)] underline"
						to="/app/requests/mine"
					>
						Mis solicitudes
					</Link>
				</div>
				<ol
					aria-label="Pasos de la solicitud"
					className="my-7 grid grid-cols-3 border-b border-[var(--border)] text-sm font-semibold sm:text-base"
				>
					{["Datos de la sesión", "Materiales", "Confirmación"].map(
						(label, index) => (
							<li
								className={`border-b-2 px-1 pb-3 text-center ${step === index ? "border-[var(--primary)] text-[var(--primary-text)]" : "border-transparent text-[var(--muted-foreground)]"}`}
								key={label}
							>
								{index + 1} <span className="hidden sm:inline">{label}</span>
							</li>
						),
					)}
				</ol>
				{step === 0 && (
					<form className="grid gap-5" onSubmit={continueFromSession}>
						<div className="rounded-xl border border-[var(--border)] p-5 sm:p-6">
							<h2 className="text-xl font-bold">Datos de la sesión</h2>
							<div className="mt-5 grid gap-4">
								<label className="grid gap-1.5 text-sm font-semibold">
									Grupo
									<select
										className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-3 font-normal"
										onChange={(event) => {
											setGroupId(event.target.value);
											setSessionDate("");
										}}
										value={groupId}
									>
										<option value="">Elige un grupo</option>
										{groups.map((group) => (
											<option key={group.id} value={group.id}>
												Grupo {group.number} · {group.subjectName} ·{" "}
												{group.teams} equipos
											</option>
										))}
									</select>
									<span className="text-xs font-normal text-[var(--muted-foreground)]">
										Solo se muestran grupos activos asignados a tu perfil.
									</span>
								</label>
								<label className="grid gap-1.5 text-sm font-semibold">
									Ejercicio
									<select
										className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-3 font-normal"
										onChange={(event) => setExerciseId(event.target.value)}
										value={exerciseId}
									>
										<option value="">Elige un ejercicio</option>
										{exercises.map((exercise) => (
											<option key={exercise.id} value={exercise.id}>
												{exercise.number} · {exercise.name}
											</option>
										))}
									</select>
									<span className="text-xs font-normal text-[var(--muted-foreground)]">
										Solo se muestran ejercicios activos.
									</span>
								</label>
								<label className="grid gap-1.5 text-sm font-semibold">
									Fecha de sesión
									<input
										className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-3 font-normal"
										disabled={!selectedGroup}
										min={
											selectedGroup
												? nextEligibleDate(
														selectedGroup.weekday,
														today,
														selectedGroup.startTime,
													)
												: today
										}
										onChange={(event) => {
											const value = event.target.value;
											if (
												!selectedGroup ||
												!isEligibleDate(
													selectedGroup.weekday,
													value,
													today,
													selectedGroup.startTime,
												)
											) {
												setSessionDate("");
												setMessage(
													"Elige una fecha futura del día asignado a tu grupo. Hoy solo está disponible antes de que comience la sesión.",
												);
												return;
											}
											setSessionDate(value);
											setMessage("");
										}}
										step={7}
										type="date"
										value={sessionDate}
									/>
									<span className="text-xs font-normal text-[var(--muted-foreground)]">
										Elige el día asignado a tu grupo. Hoy solo está disponible
										antes de que comience la sesión.
									</span>
								</label>
								<div className="rounded-lg bg-[var(--info)]/15 p-4 text-sm">
									<p className="font-semibold text-[var(--info)]">
										Anticipación mínima
									</p>
									<p className="mt-1 font-bold">
										{minimumNoticeDays}{" "}
										{minimumNoticeDays === 1 ? "día natural" : "días naturales"}
									</p>
								</div>
							</div>
							<div className="mt-8 flex justify-end border-t border-[var(--border)] pt-4">
								<button className="button-primary" type="submit">
									Siguiente: materiales
								</button>
							</div>
						</div>
						<aside className="rounded-xl border border-[var(--border)] p-5">
							<h2 className="text-lg font-bold">Resumen</h2>
							<div className="my-4 border-t border-[var(--border)]" />
							<p className="font-bold text-[var(--primary-text)]">
								{selectedExercise?.name ?? "Elige un ejercicio"}
							</p>
							<p className="mt-2 text-sm text-[var(--muted-foreground)]">
								{selectedGroup
									? `Grupo ${selectedGroup.number} · ${selectedGroup.labName}`
									: "Elige un grupo"}
							</p>
							<p className="mt-2 text-sm">
								{selectedGroup
									? `${selectedGroup.startTime.slice(0, 5)}–${selectedGroup.endTime.slice(0, 5)}`
									: ""}
							</p>
							{needsLateReason && sessionDate && (
								<div className="mt-6 rounded-lg bg-[var(--warning)]/25 p-4 text-sm">
									<p className="font-bold">Requiere excepción</p>
									<p className="mt-2">
										Esta fecha tiene menos de {minimumNoticeDays} días de
										anticipación. Al confirmar podrás indicar el motivo.
									</p>
								</div>
							)}
						</aside>
					</form>
				)}
				{step === 1 && (
					<form
						onSubmit={(event) => {
							event.preventDefault();
							setStep(2);
						}}
					>
						<div className="rounded-xl border border-[var(--border)] p-5 sm:p-6">
							<div className="flex flex-wrap justify-between gap-3">
								<div>
									<h2 className="text-xl font-bold">Revisa los materiales</h2>
									<p className="mt-1 text-sm text-[var(--muted-foreground)]">
										Las cantidades por equipo se calculan con los{" "}
										{selectedGroup?.teams} equipos de tu grupo.
									</p>
								</div>
								<span className="rounded-lg bg-[var(--secondary)] px-3 py-2 text-sm">
									{selectedExercise?.number} · {selectedExercise?.name}
								</span>
							</div>
							<div className="mt-6 grid gap-6 lg:grid-cols-2">
								<section>
									<h3 className="font-bold">Reactivos</h3>
									{exerciseMaterials?.reagents.length ? (
										<ul className="mt-2 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
											{exerciseMaterials.reagents.map((item) => (
												<li
													className="flex items-start justify-between gap-3 p-3"
													key={`${item.name}-${item.amount}-${item.unit}-${item.basis}`}
												>
													<span>
														<strong>{item.name}</strong>
														<small className="block text-[var(--muted-foreground)]">
															{item.amount} {item.unit} ·{" "}
															{item.basis === "team"
																? "por equipo"
																: "por grupo"}
														</small>
													</span>
													<label className="flex items-center gap-2 text-sm">
														<input
															checked={!omittedReagents.includes(item.name)}
															onChange={() =>
																setOmittedReagents((current) =>
																	current.includes(item.name)
																		? current.filter(
																				(name) => name !== item.name,
																			)
																		: [...current, item.name],
																)
															}
															type="checkbox"
														/>
														Incluir
													</label>
												</li>
											))}
										</ul>
									) : (
										<p className="mt-2 text-sm text-[var(--muted-foreground)]">
											Este ejercicio no requiere reactivos de catálogo.
										</p>
									)}
									<QuantityEditor
										items={addedReagents}
										label="Reactivos adicionales"
										onChange={setAddedReagents}
									/>
								</section>
								<section>
									<h3 className="font-bold">Equipo</h3>
									{exerciseMaterials?.equipment.length ? (
										<ul className="mt-2 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
											{exerciseMaterials.equipment.map((item) => (
												<li
													className="p-3"
													key={`${item.name}-${item.amount}-${item.unit}-${item.basis}`}
												>
													<strong>{item.name}</strong>
													<small className="block text-[var(--muted-foreground)]">
														{item.amount} {item.unit} ·{" "}
														{item.basis === "team" ? "por equipo" : "por grupo"}
													</small>
												</li>
											))}
										</ul>
									) : (
										<p className="mt-2 text-sm text-[var(--muted-foreground)]">
											No hay equipo de catálogo.
										</p>
									)}
									<QuantityEditor
										items={addedEquipment}
										label="Equipo adicional"
										onChange={setAddedEquipment}
									/>
								</section>
								<section>
									<h3 className="font-bold">Residuos esperados</h3>
									{exerciseMaterials?.waste.map((item) => (
										<p
											className="mt-2 rounded-lg border border-[var(--border)] p-3 text-sm"
											key={`${item.name}-${item.container}-${item.treatment}`}
										>
											<strong>{item.name}</strong> · {item.container} ·{" "}
											{item.treatment}
										</p>
									))}
									<WasteEditor items={addedWaste} onChange={setAddedWaste} />
								</section>
								<label className="grid gap-2 text-sm font-semibold">
									Nota para el personal de laboratorio
									<textarea
										className="min-h-28 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 font-normal"
										maxLength={2000}
										onChange={(event) => setProfessorNote(event.target.value)}
										value={professorNote}
									/>
								</label>
							</div>
							<div className="mt-8 flex justify-between border-t border-[var(--border)] pt-4">
								<button
									className="button-secondary"
									onClick={() => setStep(0)}
									type="button"
								>
									Anterior
								</button>
								<button className="button-primary" type="submit">
									Siguiente: confirmar
								</button>
							</div>
						</div>
					</form>
				)}
				{step === 2 && (
					<form onSubmit={submit}>
						<div className="mx-auto max-w-[600px] rounded-xl border border-[var(--border)] p-5 sm:p-6">
							<h2 className="text-xl font-bold">Confirma tu solicitud</h2>
							<dl className="mt-5 grid gap-3 sm:grid-cols-2">
								<Summary
									label="Ejercicio"
									value={`${selectedExercise?.number} · ${selectedExercise?.name}`}
								/>
								<Summary
									label="Grupo"
									value={`Grupo ${selectedGroup?.number} · ${selectedGroup?.subjectName}`}
								/>
								<Summary label="Fecha" value={formatDate(sessionDate)} />
								<Summary
									label="Laboratorio y horario"
									value={`${selectedGroup?.labName} · ${selectedGroup?.startTime.slice(0, 5)}–${selectedGroup?.endTime.slice(0, 5)}`}
								/>
								<Summary
									label="Reactivos omitidos"
									value={
										omittedReagents.length
											? omittedReagents.join(", ")
											: "Ninguno"
									}
								/>
								<Summary
									label="Materiales añadidos"
									value={`${addedReagents.length} reactivos, ${addedEquipment.length} equipos, ${addedWaste.length} residuos`}
								/>
							</dl>
							{needsLateReason && (
								<label className="mt-6 grid gap-2 text-sm font-semibold">
									Motivo de la solicitud con poca anticipación
									<textarea
										className="min-h-24 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 font-normal"
										maxLength={1000}
										onChange={(event) => setLateReason(event.target.value)}
										required
										value={lateReason}
									/>
								</label>
							)}
							<p className="mt-5 rounded-lg bg-[var(--info)]/15 p-4 text-sm">
								Al enviar, guardaremos una copia de los materiales y el horario.
								Después podrás consultar la solicitud, pero no editar su
								contenido.
							</p>
							<div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-[var(--border)] pt-4">
								<button
									className="button-secondary"
									onClick={() => setStep(1)}
									type="button"
								>
									Anterior
								</button>
								<button
									className="button-primary"
									disabled={busy}
									type="submit"
								>
									{busy ? "Enviando…" : "Enviar solicitud"}
								</button>
							</div>
						</div>
					</form>
				)}
				{message && (
					<p
						className="mt-4 rounded-lg bg-[var(--destructive)]/10 p-3 text-sm font-semibold"
						role="alert"
					>
						{message}
					</p>
				)}
			</section>
		</main>
	);
}

function QuantityEditor({
	label,
	items,
	onChange,
}: {
	label: string;
	items: EditableQuantityItem[];
	onChange: (items: EditableQuantityItem[]) => void;
}) {
	return (
		<div className="mt-4 rounded-lg bg-[var(--secondary)]/60 p-3">
			<div className="flex items-center justify-between gap-2">
				<h4 className="text-sm font-bold">{label}</h4>
				<button
					className="button-secondary !min-h-10 !px-3 !py-1"
					onClick={() => onChange([...items, emptyQuantity()])}
					type="button"
				>
					Agregar
				</button>
			</div>
			{items.map((item, index) => (
				<div className="mt-3 grid gap-2 sm:grid-cols-4" key={item.key}>
					<input
						aria-label={`Nombre ${label}`}
						className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-2 sm:col-span-2"
						onChange={(event) =>
							changeQuantity(
								items,
								index,
								{ name: event.target.value },
								onChange,
							)
						}
						placeholder="Nombre"
						value={item.name}
					/>
					<input
						aria-label={`Cantidad ${label}`}
						className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-2"
						min="0.01"
						onChange={(event) =>
							changeQuantity(
								items,
								index,
								{ amount: Number(event.target.value) },
								onChange,
							)
						}
						step="any"
						type="number"
						value={item.amount}
					/>
					<div className="flex gap-2">
						<input
							aria-label={`Unidad ${label}`}
							className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-2"
							onChange={(event) =>
								changeQuantity(
									items,
									index,
									{ unit: event.target.value },
									onChange,
								)
							}
							placeholder="Unidad"
							value={item.unit}
						/>
						<button
							aria-label={`Quitar ${label}`}
							className="button-secondary !min-h-10 !px-3 !py-1"
							onClick={() =>
								onChange(items.filter((_, itemIndex) => index !== itemIndex))
							}
							type="button"
						>
							Quitar
						</button>
					</div>
					<select
						aria-label={`Base ${label}`}
						className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-2"
						onChange={(event) =>
							changeQuantity(
								items,
								index,
								{ basis: event.target.value as QuantityItem["basis"] },
								onChange,
							)
						}
						value={item.basis}
					>
						<option value="team">Por equipo</option>
						<option value="group">Por grupo</option>
					</select>
				</div>
			))}
		</div>
	);
}

function changeQuantity(
	items: EditableQuantityItem[],
	index: number,
	patch: Partial<QuantityItem>,
	onChange: (items: EditableQuantityItem[]) => void,
) {
	onChange(
		items.map((item, itemIndex) =>
			itemIndex === index ? { ...item, ...patch } : item,
		),
	);
}

function WasteEditor({
	items,
	onChange,
}: {
	items: EditableWasteItem[];
	onChange: (items: EditableWasteItem[]) => void;
}) {
	return (
		<div className="mt-4 rounded-lg bg-[var(--secondary)]/60 p-3">
			<div className="flex justify-between gap-2">
				<h4 className="text-sm font-bold">Residuos adicionales</h4>
				<button
					className="button-secondary !min-h-10 !px-3 !py-1"
					onClick={() => onChange([...items, emptyWaste()])}
					type="button"
				>
					Agregar
				</button>
			</div>
			{items.map((item, index) => (
				<div className="mt-3 grid gap-2 sm:grid-cols-3" key={item.key}>
					{(["name", "container", "treatment"] as const).map((key) => (
						<input
							aria-label={
								key === "name"
									? "Nombre del residuo"
									: key === "container"
										? "Contenedor del residuo"
										: "Tratamiento del residuo"
							}
							className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-2"
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
							placeholder={
								key === "name"
									? "Residuo"
									: key === "container"
										? "Contenedor"
										: "Tratamiento"
							}
							value={item[key]}
						/>
					))}
				</div>
			))}
		</div>
	);
}

function Summary({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-sm text-[var(--muted-foreground)]">{label}</dt>
			<dd className="mt-1 font-semibold">{value}</dd>
		</div>
	);
}

function isEligibleDate(
	weekday: number,
	value: string,
	today: string,
	startTime: string,
) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < today) return false;
	const date = new Date(`${value}T12:00:00Z`);
	if (
		!Number.isFinite(date.getTime()) ||
		date.toISOString().slice(0, 10) !== value ||
		date.getUTCDay() !== weekday
	)
		return false;
	if (value !== today) return true;
	const time = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/Hermosillo",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(new Date());
	return time < startTime.slice(0, 5);
}

function nextEligibleDate(weekday: number, today: string, startTime: string) {
	const todayDate = new Date(`${today}T12:00:00Z`);
	const todayIsEligible =
		todayDate.getUTCDay() === weekday &&
		new Intl.DateTimeFormat("en-US", {
			timeZone: "America/Hermosillo",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		}).format(new Date()) < startTime.slice(0, 5);
	const daysUntilWeekday = (weekday - todayDate.getUTCDay() + 7) % 7;
	const offset =
		daysUntilWeekday === 0 && !todayIsEligible ? 7 : daysUntilWeekday;
	todayDate.setUTCDate(todayDate.getUTCDate() + offset);
	return todayDate.toISOString().slice(0, 10);
}

function formatDate(value: string) {
	return value
		? new Intl.DateTimeFormat("es-MX", {
				timeZone: "UTC",
				dateStyle: "long",
			}).format(new Date(`${value}T12:00:00Z`))
		: "";
}
