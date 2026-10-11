import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { groupLabel, timeRange } from "../lib/session-dates.ts";
import { OptionSelect } from "../components/option-select.tsx";
import { Combobox } from "../components/ui/combobox.tsx";
import { TimePicker } from "../components/ui/time-picker.tsx";
import { userFacingError } from "../lib/user-facing-error.ts";
import { weekdayOptions, weekdays } from "../lib/weekdays.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import { getProfessorGroupOptionsFn } from "../server/group-functions.ts";
import {
	deactivateMyGroupFn,
	listMyGroupsFn,
	reactivateMyGroupFn,
	updateMyGroupFn,
} from "../server/group-management-functions.ts";

export const Route = createFileRoute("/app/groups/manage")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("professor"))
			throw redirect({ to: "/app/dashboard" });
		const [groups, options] = await Promise.all([
			listMyGroupsFn({ data: { includeInactive: true } }),
			getProfessorGroupOptionsFn(),
		]);
		return { groups, options };
	},
	component: ManageGroupsPage,
});

type Group = Awaited<ReturnType<typeof listMyGroupsFn>>[number];
type GroupOptions = Awaited<ReturnType<typeof getProfessorGroupOptionsFn>>;

// Monday through Friday always show; weekend days only when a group meets then.
const WORK_WEEK = [1, 2, 3, 4, 5];

function ManageGroupsPage() {
	const { groups: initialGroups, options } = Route.useLoaderData();
	const { periodCode } = Route.useRouteContext();
	const [groups, setGroups] = useState(initialGroups);
	const [includeInactive, setIncludeInactive] = useState(false);
	const [message, setMessage] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [openId, setOpenId] = useState<string | null>(null);
	const activeGroups = groups.filter((group) => group.active);
	const visibleGroups = includeInactive ? groups : activeGroups;
	const weekGroups = [...activeGroups].sort((a, b) =>
		a.startTime.localeCompare(b.startTime),
	);
	const weekDays = [0, 1, 2, 3, 4, 5, 6]
		.filter(
			(day) =>
				WORK_WEEK.includes(day) ||
				weekGroups.some((group) => group.weekday === day),
		)
		.sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));

	async function reload() {
		setGroups(await listMyGroupsFn({ data: { includeInactive: true } }));
	}

	async function save(event: FormEvent<HTMLFormElement>, group: Group) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setBusyId(group.id);
		setMessage("");
		try {
			await updateMyGroupFn({
				data: {
					groupId: group.id,
					input: {
						periodCode: String(form.get("periodCode") ?? ""),
						number: Number(form.get("number")),
						labId: String(form.get("labId") ?? ""),
						careerId: String(form.get("careerId") ?? ""),
						subjectId: String(form.get("subjectId") ?? ""),
						students: Number(form.get("students")),
						teams: Number(form.get("teams")),
						weekday: Number(form.get("weekday")),
						startTime: String(form.get("startTime") ?? ""),
						endTime: String(form.get("endTime") ?? ""),
					},
				},
			});
			setMessage(`Se actualizó el grupo ${group.number}.`);
			setOpenId(null);
			await reload();
		} catch (error) {
			setMessage(userFacingError(error, "No se pudo actualizar este grupo."));
		} finally {
			setBusyId(null);
		}
	}

	async function changeActivity(group: Group) {
		setBusyId(group.id);
		setMessage("");
		try {
			if (group.active)
				await deactivateMyGroupFn({ data: { groupId: group.id } });
			else await reactivateMyGroupFn({ data: { groupId: group.id } });
			await reload();
		} catch (error) {
			setMessage(userFacingError(error, "No se pudo cambiar este grupo."));
		} finally {
			setBusyId(null);
		}
	}

	return (
		<main className="app-page">
			<div className="app-page-inner">
				<header className="page-head">
					<div className="page-head-copy">
						<h1 className="page-title">Mis grupos</h1>
						<p className="page-sub">
							{activeGroups.length}{" "}
							{activeGroups.length === 1 ? "grupo activo" : "grupos activos"}
						</p>
					</div>
					<div className="page-actions">
						{periodCode && (
							<span className="period-chip">Período {periodCode}</span>
						)}
						<Link className="button-primary" to="/app/groups/new">
							<Plus aria-hidden="true" size={18} strokeWidth={2} />
							Nuevo grupo
						</Link>
					</div>
				</header>

				<section aria-labelledby="groups-week-title" className="panel">
					<h2 className="panel-title" id="groups-week-title">
						Tu semana en el laboratorio
					</h2>
					<div className="week-grid">
						{weekDays.map((day) => {
							const dayGroups = weekGroups.filter(
								(group) => group.weekday === day,
							);
							return (
								<div className="week-day" key={day}>
									<span>{weekdays[day]}</span>
									{dayGroups.length === 0 && (
										<div className="week-slot is-empty">Sin laboratorio</div>
									)}
									{dayGroups.map((group) => (
										<div className="week-slot" key={group.id}>
											<strong>{group.subjectName}</strong>
											<span className="row-group">
												{groupLabel(group.number)}
											</span>
											<small>
												{timeRange(group.startTime, group.endTime)} ·{" "}
												{group.labName}
											</small>
										</div>
									))}
								</div>
							);
						})}
					</div>
				</section>

				<section aria-labelledby="groups-list-title" className="stack-section">
					<div className="panel-head">
						<h2 className="panel-title" id="groups-list-title">
							Todos tus grupos
						</h2>
						{/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add a legend the design does not have */}
						<div
							aria-label="Filtrar por estado"
							className="seg-group"
							role="group"
						>
							<button
								aria-pressed={!includeInactive}
								className="seg"
								onClick={() => setIncludeInactive(false)}
								type="button"
							>
								Activos · {activeGroups.length}
							</button>
							<button
								aria-pressed={includeInactive}
								className="seg"
								onClick={() => setIncludeInactive(true)}
								type="button"
							>
								Todos · {groups.length}
							</button>
						</div>
					</div>
					{message && (
						<output aria-live="polite" className="notice notice-accent">
							{message}
						</output>
					)}
					{visibleGroups.length === 0 && (
						<p className="empty-state">
							{includeInactive
								? "No hay grupos para mostrar."
								: "No hay grupos activos para mostrar."}{" "}
							<Link to="/app/groups/new">Registra un grupo</Link>
						</p>
					)}
					<div className="card-grid">
						{visibleGroups.map((group) => (
							<article
								className={`group-card${group.active ? "" : " is-inactive"}`}
								key={group.id}
							>
								<header className="group-card-head">
									<div>
										<h3>{group.subjectName}</h3>
										<p>
											{group.careerName}
											{group.periodCode !== periodCode &&
												` · Período ${group.periodCode}`}
										</p>
									</div>
									<div className="group-card-tags">
										<span>{groupLabel(group.number)}</span>
										<span
											className={`chip ${group.active ? "chip-ok" : "chip-off"}`}
										>
											{group.active ? "Activo" : "Inactivo"}
										</span>
									</div>
								</header>
								<dl className="kv is-two">
									<div>
										<dt>Día y hora</dt>
										<dd>
											{weekdays[group.weekday]},{" "}
											{timeRange(group.startTime, group.endTime)}
										</dd>
									</div>
									<div>
										<dt>Laboratorio</dt>
										<dd>{group.labName}</dd>
									</div>
									<div>
										<dt>Estudiantes</dt>
										<dd>{group.students}</dd>
									</div>
									<div>
										<dt>Equipos</dt>
										<dd>{group.teams}</dd>
									</div>
								</dl>
								<footer className="group-card-foot">
									{group.active && (
										<Link
											className="button-secondary"
											search={{ group: group.id }}
											to="/app/requests/new"
										>
											Solicitar preparación
										</Link>
									)}
									<button
										aria-expanded={openId === group.id}
										className="button-secondary"
										onClick={() =>
											setOpenId(openId === group.id ? null : group.id)
										}
										type="button"
									>
										{group.active ? "Editar" : "Ver detalle"}
									</button>
								</footer>
								{openId === group.id && (
									<GroupForm
										busy={busyId === group.id}
										group={group}
										onChangeActivity={() => void changeActivity(group)}
										onSubmit={(event) => void save(event, group)}
										options={options}
									/>
								)}
							</article>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}

function GroupForm({
	group,
	options,
	busy,
	onSubmit,
	onChangeActivity,
}: {
	group: Group;
	options: GroupOptions;
	busy: boolean;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onChangeActivity: () => void;
}) {
	return (
		<form className="group-form" onSubmit={onSubmit}>
			<div className="field-label">
				<label htmlFor={`group-${group.id}-0`}>Período académico</label>
				<Combobox
					id={`group-${group.id}-0`}
					className="field-outline"
					defaultValue={group.periodCode}
					emptyText="Ningún período coincide."
					name="periodCode"
					options={[
						...(options.periods.some(({ code }) => code === group.periodCode)
							? []
							: [{ value: group.periodCode, label: group.periodCode }]),
						...options.periods.map(({ code }) => ({ value: code, label: code })),
					]}
					searchPlaceholder="Buscar período"
				/>
			</div>
			<Field
				label="Número de grupo"
				min="1"
				name="number"
				type="number"
				value={group.number}
			/>
			<CatalogSelect
				current={{ id: group.labId, name: group.labName }}
				entries={options.labs}
				label="Laboratorio"
				name="labId"
			/>
			<CatalogSelect
				current={{ id: group.careerId, name: group.careerName }}
				entries={options.careers}
				label="Carrera"
				name="careerId"
			/>
			<CatalogSelect
				current={{ id: group.subjectId, name: group.subjectName }}
				entries={options.subjects}
				label="Materia"
				name="subjectId"
			/>
			<Field
				label="Estudiantes"
				max="60"
				min="1"
				name="students"
				type="number"
				value={group.students}
			/>
			<Field
				label="Equipos"
				min="1"
				name="teams"
				type="number"
				value={group.teams}
			/>
			<div className="field-label">
				<label htmlFor={`group-${group.id}-1`}>Día de la semana</label>
				<OptionSelect
					id={`group-${group.id}-1`}
					className="w-full"
					defaultValue={String(group.weekday)}
					name="weekday"
					options={weekdayOptions}
				/>
			</div>
			<Field
				label="Hora de inicio"
				name="startTime"
				type="time"
				value={group.startTime.slice(0, 5)}
			/>
			<Field
				label="Hora de término"
				name="endTime"
				type="time"
				value={group.endTime.slice(0, 5)}
			/>
			<div className="group-form-actions">
				<button className="button-primary" disabled={busy} type="submit">
					{busy ? "Guardando…" : "Guardar cambios"}
				</button>
				<button
					className={`button-secondary${group.active ? " button-danger" : ""}`}
					disabled={busy}
					onClick={onChangeActivity}
					type="button"
				>
					{group.active ? "Desactivar" : "Reactivar"}
				</button>
			</div>
		</form>
	);
}

function Field({
	label,
	name,
	type,
	value,
	min,
	max,
}: {
	label: string;
	name: string;
	type: string;
	value: string | number;
	min?: string;
	max?: string;
}) {
	const id = useId();
	return (
		<div className="field-label">
			<label htmlFor={id}>{label}</label>
			{type === "time" ? (
				<TimePicker
					id={id}
					className="field-outline"
					defaultValue={value}
					name={name}
					required
				/>
			) : (
				<input
					id={id}
					className="field-outline"
					defaultValue={value}
					max={max}
					min={min}
					name={name}
					required
					type={type}
				/>
			)}
		</div>
	);
}

function CatalogSelect({
	label,
	name,
	current,
	entries,
}: {
	label: string;
	name: string;
	current: { id: string; name: string };
	entries: Array<{ id: string; name: string }>;
}) {
	const id = useId();
	return (
		<div className="field-label">
			<label htmlFor={id}>{label}</label>
			<Combobox
				id={id}
				className="field-outline"
				defaultValue={current.id}
				emptyText="Sin resultados."
				name={name}
				options={[
					...(entries.some(({ id }) => id === current.id)
						? []
						: [
								{
									value: current.id,
									label: `${current.name} (nombre guardado)`,
								},
							]),
					...entries.map((entry) => ({ value: entry.id, label: entry.name })),
				]}
			/>
		</div>
	);
}
