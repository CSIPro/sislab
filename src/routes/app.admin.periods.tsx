import { createFileRoute, redirect } from "@tanstack/react-router";
import { CircleCheck, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { TableShell } from "../components/table-shell.tsx";
import { DatePicker } from "../components/ui/date-picker.tsx";
import {
	type AcademicPeriodStatus,
	academicPeriodStatus,
	currentAcademicPeriodCode,
	regularPeriodCodes,
} from "../lib/academic-period.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import {
	ensureRegularAcademicPeriodsFn,
	listAcademicPeriodsWithGroupCountsFn,
	saveAcademicPeriodFn,
} from "../server/academic-period-functions.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/app/admin/periods")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		return { periods: await listAcademicPeriodsWithGroupCountsFn() };
	},
	component: AcademicPeriodsPage,
});

const statusChips: Record<AcademicPeriodStatus, [string, string]> = {
	current: ["chip-ok", "Actual"],
	upcoming: ["chip-next", "Próximo"],
	concluded: ["chip-off", "Concluido"],
};

const emptyForm = { code: "", startsOn: "", endsOn: "" };

function AcademicPeriodsPage() {
	const initial = Route.useLoaderData();
	const [periods, setPeriods] = useState(initial.periods);
	const [form, setForm] = useState(emptyForm);
	const [editing, setEditing] = useState(false);
	const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
		null,
	);
	const [busy, setBusy] = useState(false);
	const currentCode = currentAcademicPeriodCode();
	const currentYear = Number(currentCode.split("-")[0]);
	const seedYears = [currentYear, currentYear + 1];
	const seedCodes = seedYears.flatMap((year) => regularPeriodCodes(year));
	const allSeeded = seedCodes.every((code) =>
		periods.some((period) => period.code === code),
	);

	async function seedPeriods() {
		setBusy(true);
		setNotice(null);
		const existing = seedCodes.filter((code) =>
			periods.some((period) => period.code === code),
		);
		const added = seedCodes.filter((code) => !existing.includes(code));
		try {
			await ensureRegularAcademicPeriodsFn({ data: { years: seedYears } });
			setPeriods(await listAcademicPeriodsWithGroupCountsFn());
			setNotice({
				text: `Se agregaron ${listed(added)}.${
					existing.length > 0
						? ` ${listed(existing)} ya ${existing.length === 1 ? "existía, así que se dejó como estaba" : "existían, así que se dejaron como estaban"}.`
						: ""
				} Puedes agregar las fechas oficiales cuando las tengas.`,
				error: false,
			});
		} catch {
			setNotice({
				text: "No se pudieron crear los períodos. Inténtalo de nuevo.",
				error: true,
			});
		} finally {
			setBusy(false);
		}
	}

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setNotice(null);
		try {
			const saved = await saveAcademicPeriodFn({
				data: {
					code: form.code,
					startsOn: form.startsOn || null,
					endsOn: form.endsOn || null,
				},
			});
			setPeriods(await listAcademicPeriodsWithGroupCountsFn());
			setForm(emptyForm);
			setEditing(false);
			setNotice({ text: `Se guardó el período ${saved.code}.`, error: false });
		} catch (error) {
			setNotice({
				text: userFacingError(error, "No se pudo guardar este período."),
				error: true,
			});
		} finally {
			setBusy(false);
		}
	}

	function stopEditing() {
		setForm(emptyForm);
		setEditing(false);
	}

	return (
		<main className="app-page">
			<div className="app-page-inner is-narrow">
				<header className="page-head">
					<div className="page-head-copy">
						<h1 className="page-title">Períodos</h1>
						<p className="page-sub">
							Los períodos académicos en los que se registran los grupos. Las
							fechas oficiales son opcionales.
						</p>
					</div>
					<div className="flex flex-col items-end gap-1.5">
						<button
							className="button-secondary button-tall"
							disabled={busy || allSeeded}
							onClick={seedPeriods}
							type="button"
						>
							<Plus aria-hidden="true" size={18} strokeWidth={2} />
							{allSeeded
								? "Períodos agregados"
								: `Agregar períodos ${seedYears.join(" y ")}`}
						</button>
						<span className="max-w-80 text-right text-[13px] text-muted-foreground">
							Crea {listed(seedCodes)}. Los que ya existen se omiten.
						</span>
					</div>
				</header>

				{notice && (
					<output
						aria-live="polite"
						className={`notice ${notice.error ? "notice-error" : "notice-accent"}`}
					>
						{!notice.error && (
							<CircleCheck aria-hidden="true" size={20} strokeWidth={2} />
						)}
						<p>{notice.text}</p>
					</output>
				)}

				<div className="split is-top">
					<TableShell className="min-w-0 flex-[1.6_1_520px]">
						<table className="data-table" style={{ minWidth: 560 }}>
							<thead>
								<tr>
									<th scope="col">Código</th>
									<th scope="col">Inicio</th>
									<th scope="col">Fin</th>
									<th scope="col">Grupos</th>
									<th scope="col">Estado</th>
									<th scope="col">Acciones</th>
								</tr>
							</thead>
							<tbody>
								{[...periods].reverse().map((period) => {
									const [chipClass, label] =
										statusChips[academicPeriodStatus(period.code, currentCode)];
									return (
										<tr key={period.code}>
											<td>
												<strong>{period.code}</strong>
											</td>
											<td>{officialDate(period.startsOn)}</td>
											<td>{officialDate(period.endsOn)}</td>
											<td>{period.groupCount}</td>
											<td>
												<span className={`chip ${chipClass}`}>{label}</span>
											</td>
											<td>
												<button
													aria-label={`Editar ${period.code}`}
													className="button-secondary button-sm"
													disabled={busy}
													onClick={() => {
														setForm({
															code: period.code,
															startsOn: period.startsOn ?? "",
															endsOn: period.endsOn ?? "",
														});
														setEditing(true);
														setNotice(null);
													}}
													type="button"
												>
													Editar
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
						{periods.length === 0 && (
							<p className="table-empty">Aún no hay períodos.</p>
						)}
					</TableShell>

					<section
						aria-labelledby="period-form-title"
						className="panel max-w-[400px] flex-[1_1_300px]"
					>
						<h2 className="m-0 text-xl font-bold" id="period-form-title">
							{editing ? `Editar ${form.code}` : "Agregar período"}
						</h2>
						<form className="flex flex-col gap-4" onSubmit={save}>
							{!editing && (
								<label className="field-label">
									Código
									<input
										className="field-outline"
										onChange={(event) =>
											setForm({ ...form, code: event.target.value })
										}
										pattern="[0-9]{4}-[12]"
										placeholder={`${currentYear + 1}-1`}
										required
										value={form.code}
									/>
									<span className="field-hint">Usa AAAA-1 o AAAA-2.</span>
								</label>
							)}
							<div className="field-label">
								<label htmlFor="period-starts-on">Inicio (opcional)</label>
								<DatePicker
									className="field-outline"
									clearable
									id="period-starts-on"
									onValueChange={(startsOn) => setForm({ ...form, startsOn })}
									value={form.startsOn}
								/>
							</div>
							<div className="field-label">
								<label htmlFor="period-ends-on">Fin (opcional)</label>
								<DatePicker
									className="field-outline"
									clearable
									id="period-ends-on"
									min={form.startsOn || undefined}
									onValueChange={(endsOn) => setForm({ ...form, endsOn })}
									value={form.endsOn}
								/>
								<span className="field-hint">
									Escribe las dos fechas o deja las dos vacías.
								</span>
							</div>
							<div className="flex flex-wrap gap-3">
								<button
									className="button-primary"
									disabled={busy}
									type="submit"
								>
									{editing ? "Guardar período" : "Agregar período"}
								</button>
								{editing && (
									<button
										className="button-secondary button-tall"
										disabled={busy}
										onClick={stopEditing}
										type="button"
									>
										Cancelar
									</button>
								)}
							</div>
						</form>
					</section>
				</div>

				<p className="footnote">
					Los formularios de grupo sugieren el período actual, pero permiten
					elegir otro. Las fechas del período no limitan las solicitudes.
				</p>
			</div>
		</main>
	);
}

const listFormat = new Intl.ListFormat("es-MX", { type: "conjunction" });
/** "2026-1, 2026-2 y 2027-1" */
function listed(codes: string[]) {
	return listFormat.format(codes);
}

const dateFormat = new Intl.DateTimeFormat("es-MX", {
	timeZone: "UTC",
	dateStyle: "medium",
});
function officialDate(date: string | null) {
	return date ? dateFormat.format(new Date(`${date}T12:00:00Z`)) : "Sin fecha";
}
