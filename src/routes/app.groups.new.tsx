import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { OptionSelect } from "../components/option-select.tsx";
import { Combobox } from "../components/ui/combobox.tsx";
import { TimePicker } from "../components/ui/time-picker.tsx";
import { userFacingError } from "../lib/user-facing-error.ts";
import { weekdayOptions } from "../lib/weekdays.ts";
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

function NewGroupPage() {
	const options = Route.useLoaderData();
	const [periodCode, setPeriodCode] = useState(
		options.suggestedCode ?? options.periods[0]?.code ?? "",
	);
	const [message, setMessage] = useState("");
	const [createdNumber, setCreatedNumber] = useState<number | null>(null);
	const [busy, setBusy] = useState(false);
	const [formKey, setFormKey] = useState(0);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
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
				`El grupo ${group.number} se registró en el período ${group.periodCode}.`,
			);
			// A new key remounts the form, which also clears the pickers.
			setFormKey((key) => key + 1);
			setPeriodCode(options.suggestedCode ?? options.periods[0]?.code ?? "");
		} catch (error) {
			setMessage(userFacingError(error, "No se pudo registrar el grupo. Inténtalo de nuevo."));
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-xl rounded-2xl p-6 sm:p-8">
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--foreground)]">
					Registrar grupo
				</h1>
				<p className="text-[var(--muted-foreground)]">
					Elige un período disponible y registra el horario de laboratorio asignado a tu grupo. SISLAB no asigna ni reserva horarios. Deja el número de grupo vacío para usar el siguiente número disponible.
				</p>
				{options.periods.length === 0 && (
					<output className="mt-5 rounded-lg border border-[var(--border)] p-3">
						Aún no hay períodos académicos disponibles. Pide a una persona administradora que configure uno.
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
						<form className="mt-6 grid gap-4" key={formKey} onSubmit={submit}>
							<div className="grid gap-1 text-sm font-medium">
								<label htmlFor="new-group-period">Período académico</label>
								<Combobox
									id="new-group-period"
									className="field-outline"
									emptyText="Ningún período coincide."
									name="periodCode"
									onValueChange={setPeriodCode}
									options={options.periods.map(({ code }) => ({
										value: code,
										label:
											code === options.suggestedCode
												? `${code} (sugerido)`
												: code,
									}))}
									searchPlaceholder="Buscar período"
									value={periodCode}
								/>
							</div>
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
							<div className="grid gap-1 text-sm font-medium">
								<label htmlFor="new-group-lab">Laboratorio</label>
								<Combobox
									id="new-group-lab"
									className="field-outline"
									defaultValue={options.labs[0]?.id}
									emptyText="Ningún laboratorio coincide."
									name="labId"
									options={options.labs.map(({ id, name }) => ({
										value: id,
										label: name,
									}))}
									searchPlaceholder="Buscar laboratorio"
								/>
							</div>
							<div className="grid gap-1 text-sm font-medium">
								<label htmlFor="new-group-career">Carrera</label>
								<Combobox
									id="new-group-career"
									className="field-outline"
									defaultValue={options.careers[0]?.id}
									emptyText="Ninguna carrera coincide."
									name="careerId"
									options={options.careers.map(({ id, name }) => ({
										value: id,
										label: name,
									}))}
									searchPlaceholder="Buscar carrera"
								/>
							</div>
							<div className="grid gap-1 text-sm font-medium">
								<label htmlFor="new-group-subject">Materia</label>
								<Combobox
									id="new-group-subject"
									className="field-outline"
									defaultValue={options.subjects[0]?.id}
									emptyText="Ninguna materia coincide."
									name="subjectId"
									options={options.subjects.map(({ id, name }) => ({
										value: id,
										label: name,
									}))}
									searchPlaceholder="Buscar materia"
								/>
							</div>
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
							<div className="grid gap-1 text-sm font-medium">
								<label htmlFor="new-group-weekday">Día de la semana</label>
								<OptionSelect
									id="new-group-weekday"
									className="w-full"
									defaultValue="0"
									name="weekday"
									options={weekdayOptions}
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="grid gap-1 text-sm font-medium">
									<label htmlFor="new-group-start">Hora de inicio</label>
									<TimePicker
										id="new-group-start"
										className="field-outline" name="startTime" required
									/>
								</div>
								<div className="grid gap-1 text-sm font-medium">
									<label htmlFor="new-group-end">Hora de término</label>
									<TimePicker
										id="new-group-end"
										className="field-outline" name="endTime" required
									/>
								</div>
							</div>
							<div>
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
