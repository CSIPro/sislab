import { createFileRoute, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { userFacingError } from "../lib/user-facing-error.ts";
import { weekdays } from "../lib/weekdays.ts";
import {
	deactivateAnyGroupFn,
	getAdminGroupOptionsFn,
	listAllGroupsFn,
	reactivateAnyGroupFn,
	updateAnyGroupFn,
} from "../server/admin-group-functions.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/app/admin/groups")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		const [groups, options] = await Promise.all([
			listAllGroupsFn({ data: { includeInactive: true } }),
			getAdminGroupOptionsFn(),
		]);
		return { groups, options };
	},
	component: AdminGroupsPage,
});

function AdminGroupsPage() {
	const { groups: initialGroups, options } = Route.useLoaderData();
	const [groups, setGroups] = useState(initialGroups);
	const [includeInactive, setIncludeInactive] = useState(true);
	const [message, setMessage] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);

	async function showGroups(showInactive: boolean) {
		setIncludeInactive(showInactive);
		setGroups(
			await listAllGroupsFn({ data: { includeInactive: showInactive } }),
		);
	}

	async function save(event: FormEvent<HTMLFormElement>, groupId: string) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const current = groups.find(({ group }) => group.id === groupId)?.group;
		if (!current) return;
		setBusyId(groupId);
		setMessage("");
		try {
			await updateAnyGroupFn({
				data: {
					groupId,
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
			setMessage(
				`Se actualizó el grupo ${current.number} de ${groups.find(({ group }) => group.id === groupId)?.professor.name}.`,
			);
			await showGroups(includeInactive);
		} catch (error) {
			setMessage(userFacingError(error, "No se pudo actualizar este grupo."));
		} finally {
			setBusyId(null);
		}
	}

	async function changeActivity(groupId: string, active: boolean) {
		setBusyId(groupId);
		setMessage("");
		try {
			if (active) await deactivateAnyGroupFn({ data: { groupId } });
			else await reactivateAnyGroupFn({ data: { groupId } });
			await showGroups(includeInactive);
		} catch (error) {
			setMessage(userFacingError(error, "No se pudo cambiar este grupo."));
		} finally {
			setBusyId(null);
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-6xl rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Administración</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--foreground)]">
					Grupos del profesorado
				</h1>
				<p className="text-[var(--muted-foreground)]">
					Consulta y corrige los datos de los grupos de todo el profesorado, conservando a cada persona como responsable de sus grupos.
				</p>
				<div className="mt-5 flex flex-wrap gap-4">
					<button
						className="font-semibold underline"
						onClick={() => void showGroups(false)}
						type="button"
					>
						Grupos activos
					</button>
					<button
						className="font-semibold underline"
						onClick={() => void showGroups(true)}
						type="button"
					>
						Incluir grupos inactivos
					</button>
				</div>
				{message && (
					<output aria-live="polite" className="mt-4 block" role="status">
						{message}
					</output>
				)}
				{groups.length === 0 && <p className="mt-6">No hay grupos para mostrar.</p>}
				<div className="mt-6 grid gap-5">
					{groups.map(({ group, professor }) => (
						<article
							className="rounded-xl border border-[var(--border)] p-4"
							key={group.id}
						>
							<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
								<div>
									<h2 className="text-xl font-semibold">
										{group.periodCode} · Grupo {group.number}
									</h2>
									<p>
										{professor.name} {professor.surname} · {professor.email}
									</p>
								</div>
								<div className="flex items-center gap-3">
									<span>{group.active ? "Activo" : "Inactivo"}</span>
									<button
										className="font-semibold underline"
										disabled={busyId === group.id}
										onClick={() => void changeActivity(group.id, group.active)}
										type="button"
									>
										{group.active ? "Desactivar" : "Reactivar"}
									</button>
								</div>
							</div>
							<form
								className="grid gap-4 sm:grid-cols-2"
								onSubmit={(event) => void save(event, group.id)}
							>
								<label className="grid gap-1 text-sm font-medium">
									Periodo académico
									<select
										className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
										defaultValue={group.periodCode}
										name="periodCode"
										required
									>
										{!options.periods.some(
											({ code }) => code === group.periodCode,
										) && (
											<option value={group.periodCode}>
												{group.periodCode}
											</option>
										)}
										{options.periods.map(({ code }) => (
											<option key={code} value={code}>
												{code}
											</option>
										))}
									</select>
								</label>
								<Field
									label="Número de grupo"
									name="number"
									type="number"
									min="1"
									value={group.number}
								/>
								<CatalogSelect
									label="Laboratorio"
									name="labId"
									current={{ id: group.labId, name: group.labName }}
									entries={options.labs}
								/>
								<CatalogSelect
									label="Carrera"
									name="careerId"
									current={{ id: group.careerId, name: group.careerName }}
									entries={options.careers}
								/>
								<CatalogSelect
									label="Materia"
									name="subjectId"
									current={{ id: group.subjectId, name: group.subjectName }}
									entries={options.subjects}
								/>
								<Field
									label="Estudiantes"
									name="students"
									type="number"
									min="1"
									max="60"
									value={group.students}
								/>
								<Field
									label="Equipos"
									name="teams"
									type="number"
									min="1"
									value={group.teams}
								/>
								<label className="grid gap-1 text-sm font-medium">
									Día de la semana
									<select
										className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
										defaultValue={group.weekday}
										name="weekday"
									>
										{weekdays.map((day, index) => (
											<option key={day} value={index}>
												{day}
											</option>
										))}
									</select>
								</label>
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
								<div className="sm:col-span-2">
									<button
										className="rounded-lg bg-[var(--primary)] px-5 py-2.5 font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
										disabled={busyId === group.id}
										type="submit"
									>
										{busyId === group.id ? "Guardando…" : "Guardar cambios"}
									</button>
								</div>
							</form>
						</article>
					))}
				</div>
			</section>
		</main>
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
	return (
		<label className="grid gap-1 text-sm font-medium">
			{label}
			<input
				className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
				defaultValue={value}
				max={max}
				min={min}
				name={name}
				type={type}
				required
			/>
		</label>
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
	return (
		<label className="grid gap-1 text-sm font-medium">
			{label}
			<select
				className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
				defaultValue={current.id}
				name={name}
				required
			>
				{!entries.some(({ id }) => id === current.id) && (
					<option value={current.id}>{current.name} (nombre guardado)</option>
				)}
				{entries.map(({ id, name: entryName }) => (
					<option key={id} value={id}>
						{entryName}
					</option>
				))}
			</select>
		</label>
	);
}
