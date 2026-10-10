import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { userFacingError } from "../lib/user-facing-error.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	getProfessorGroupOptionsFn,
	registerProfessorGroupFn,
} from "../server/group-functions.ts";

export const Route = createFileRoute("/app/groups/new")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("professor")) throw redirect({ to: "/app/dashboard" });
		return getProfessorGroupOptionsFn();
	},
	component: NewGroupPage,
});

const weekdays = [
	"Domingo",
	"Lunes",
	"Martes",
	"Miércoles",
	"Jueves",
	"Viernes",
	"Sábado",
];

function NewGroupPage() {
	const options = Route.useLoaderData();
	const [periodCode, setPeriodCode] = useState(
		options.suggestedCode ?? options.periods[0]?.code ?? "",
	);
	const [message, setMessage] = useState("");
	const [createdNumber, setCreatedNumber] = useState<number | null>(null);
	const [busy, setBusy] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		setBusy(true);
		setMessage("");
		setCreatedNumber(null);
		try {
			const group = await registerProfessorGroupFn({
				data: {
					periodCode,
					number: String(form.get("number") ?? "").trim()
						? Number(form.get("number"))
						: null,
					labId: String(form.get("labId") ?? ""),
					careerId: String(form.get("careerId") ?? ""),
					subjectId: String(form.get("subjectId") ?? ""),
					students: Number(form.get("students")),
					teams: Number(form.get("teams")),
					weekday: Number(form.get("weekday")),
					startTime: String(form.get("startTime") ?? ""),
					endTime: String(form.get("endTime") ?? ""),
				},
			});
			setCreatedNumber(group.number);
			setMessage(
				`El grupo ${group.number} se registró en el periodo ${group.periodCode}.`,
			);
			formElement.reset();
			setPeriodCode(options.suggestedCode ?? options.periods[0]?.code ?? "");
		} catch (error) {
			setMessage(userFacingError(error, "No se pudo registrar el grupo. Inténtalo de nuevo."));
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-3xl rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Espacio de profesorado</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--foreground)]">
					Registrar grupo
				</h1>
				<p className="text-[var(--muted-foreground)]">
					Elige un periodo disponible y registra el horario de laboratorio asignado a tu grupo. SISLAB no asigna ni reserva horarios. Deja el número de grupo vacío para usar el siguiente número disponible.
				</p>
				{options.periods.length === 0 && (
					<output className="mt-5 rounded-lg border border-[var(--border)] p-3">
						Aún no hay periodos académicos disponibles. Pide a una persona administradora que configure uno.
					</output>
				)}
				{(options.labs.length === 0 ||
					options.careers.length === 0 ||
					options.subjects.length === 0) && (
					<output className="mt-3 rounded-lg border border-[var(--border)] p-3">
						Uno o más catálogos no tienen opciones activas. Pide a una persona administradora que los complete.
					</output>
				)}
				{options.periods.length > 0 &&
					options.labs.length > 0 &&
					options.careers.length > 0 &&
					options.subjects.length > 0 && (
						<form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
							<label className="grid gap-1 text-sm font-medium">
								Periodo académico
								<select
									className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
									name="periodCode"
									value={periodCode}
									onChange={(event) => setPeriodCode(event.currentTarget.value)}
									required
								>
									{options.periods.map(({ code }) => (
										<option key={code} value={code}>
											{code}
											{code === options.suggestedCode ? " (sugerido)" : ""}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Número de grupo (opcional)
								<input
									className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
									name="number"
									type="number"
									min="1"
									step="1"
									placeholder="Siguiente disponible"
								/>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Laboratorio
								<select
									className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
									name="labId"
									required
								>
									{options.labs.map(({ id, name }) => (
										<option key={id} value={id}>
											{name}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Carrera
								<select
									className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
									name="careerId"
									required
								>
									{options.careers.map(({ id, name }) => (
										<option key={id} value={id}>
											{name}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-1 text-sm font-medium sm:col-span-2">
								Materia
								<select
									className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
									name="subjectId"
									required
								>
									{options.subjects.map(({ id, name }) => (
										<option key={id} value={id}>
											{name}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Estudiantes
								<input
									className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
									name="students"
									type="number"
									min="1"
									max="60"
									step="1"
									defaultValue="1"
									required
								/>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Equipos
								<input
									className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
									name="teams"
									type="number"
									min="1"
									step="1"
									defaultValue="1"
									required
								/>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Día de la semana
								<select
									className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
									name="weekday"
									required
								>
									{weekdays.map((day, index) => (
										<option key={day} value={index}>
											{day}
										</option>
									))}
								</select>
							</label>
							<div className="grid grid-cols-2 gap-3">
								<label className="grid gap-1 text-sm font-medium">
									Hora de inicio
									<input
										className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
										name="startTime"
										type="time"
										required
									/>
								</label>
								<label className="grid gap-1 text-sm font-medium">
									Hora de término
									<input
										className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
										name="endTime"
										type="time"
										required
									/>
								</label>
							</div>
							<div className="sm:col-span-2">
								<button
									className="rounded-lg bg-[var(--primary)] px-5 py-2.5 font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
									disabled={busy}
									type="submit"
								>
									{busy ? "Registrando…" : "Registrar grupo"}
								</button>
							</div>
						</form>
					)}
				{message && <output aria-live="polite" className="mt-4 text-sm" role="status">{message}</output>}
				{createdNumber !== null && (
					<p className="mt-2 text-sm">
						<Link className="font-semibold underline" to="/app/dashboard">
							Volver al inicio
						</Link>
					</p>
				)}
			</section>
		</main>
	);
}
