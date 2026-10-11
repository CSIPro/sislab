import { createFileRoute, redirect } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
	addDays,
	formatSessionDate,
	sislabToday,
} from "../lib/session-dates.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	getMinimumNoticeDaysFn,
	saveMinimumNoticeDaysFn,
} from "../server/minimum-notice-functions.ts";

const DEFAULT_NOTICE_DAYS = 7;
const MAX_NOTICE_DAYS = 60;
/** How far from today the two example dates in the preview fall. */
const PREVIEW_DAYS_AHEAD = [3, 8];

export const Route = createFileRoute("/app/admin/settings")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		return {
			minNoticeDays: await getMinimumNoticeDaysFn(),
			today: sislabToday(),
		};
	},
	component: SettingsPage,
});

function SettingsPage() {
	const { minNoticeDays, today } = Route.useLoaderData();
	const [days, setDays] = useState(minNoticeDays);
	const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
		null,
	);
	const [busy, setBusy] = useState(false);

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setNotice(null);
		try {
			const saved = await saveMinimumNoticeDaysFn({
				data: { minNoticeDays: days },
			});
			setDays(saved);
			setNotice({
				text: `El aviso mínimo quedó en ${dayCount(saved)}.`,
				error: false,
			});
		} catch (error) {
			setNotice({
				text: userFacingError(error, "No se pudo guardar el aviso mínimo."),
				error: true,
			});
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="app-page">
			<div className="app-page-inner is-form">
				<header className="page-head-copy">
					<h1 className="page-title">Configuración</h1>
					<p className="page-sub">
						Ajustes generales de SISLAB para administración.
					</p>
				</header>

				<form className="panel is-form" onSubmit={save}>
					<div className="flex flex-col gap-1.5">
						<h2 className="panel-title">Aviso mínimo para solicitudes</h2>
						<p className="m-0 text-pretty text-muted-foreground">
							Días de calendario que deben pasar entre el envío de una solicitud
							de preparación y la fecha de la práctica. Con menos aviso, el
							profesor debe explicar el motivo y el personal decide si la
							acepta.
						</p>
					</div>

					<div className="field-label">
						<label htmlFor="min-notice-days">Días de aviso</label>
						<div className="stepper">
							<button
								aria-label="Restar un día"
								className="stepper-button"
								disabled={days <= 0}
								onClick={() => setDays(Math.max(0, days - 1))}
								type="button"
							>
								<Minus aria-hidden="true" size={20} />
							</button>
							<input
								className="field"
								id="min-notice-days"
								max={MAX_NOTICE_DAYS}
								min="0"
								onChange={(event) => {
									const value = Math.trunc(event.target.valueAsNumber);
									setDays(
										Number.isNaN(value)
											? 0
											: Math.min(MAX_NOTICE_DAYS, Math.max(0, value)),
									);
								}}
								required
								step="1"
								type="number"
								value={days}
							/>
							<button
								aria-label="Sumar un día"
								className="stepper-button"
								disabled={days >= MAX_NOTICE_DAYS}
								onClick={() => setDays(days + 1)}
								type="button"
							>
								<Plus aria-hidden="true" size={20} />
							</button>
							<span className="text-[15px] font-normal text-muted-foreground">
								{days === 1 ? "día" : "días"}
							</span>
						</div>
						<span className="field-hint">
							Valor inicial: {dayCount(DEFAULT_NOTICE_DAYS)}. Las fechas usan la
							zona horaria America/Hermosillo.
						</span>
					</div>

					<div className="preview-box">
						<h3 className="detail-title">
							Cómo se verá hoy,{" "}
							{formatSessionDate(today, "long").toLocaleLowerCase("es-MX")}
						</h3>
						<p>
							La primera fecha con aviso suficiente es el{" "}
							<strong>
								{formatSessionDate(
									addDays(today, days),
									"long",
								).toLocaleLowerCase("es-MX")}
							</strong>
							.
						</p>
						<div className="flex flex-col gap-2">
							{PREVIEW_DAYS_AHEAD.map((ahead) => (
								<div className="preview-row" key={ahead}>
									<span>
										{formatSessionDate(addDays(today, ahead), "long")}{" "}
										<small>· {dayCount(ahead)}</small>
									</span>
									<span
										className={`chip ${ahead < days ? "chip-wait" : "chip-ok"}`}
									>
										{ahead < days ? "Requiere motivo" : "Con aviso suficiente"}
									</span>
								</div>
							))}
						</div>
					</div>

					{notice && (
						<output
							aria-live="polite"
							className={`notice ${notice.error ? "notice-error" : "notice-accent"}`}
						>
							{notice.text}
						</output>
					)}

					<div className="panel-actions">
						<button className="button-primary" disabled={busy} type="submit">
							{busy ? "Guardando…" : "Guardar cambios"}
						</button>
						<button
							className="button-secondary"
							disabled={busy || days === DEFAULT_NOTICE_DAYS}
							onClick={() => setDays(DEFAULT_NOTICE_DAYS)}
							type="button"
						>
							Restablecer a {dayCount(DEFAULT_NOTICE_DAYS)}
						</button>
					</div>
				</form>

				<p className="footnote">
					El cambio aplica a las solicitudes nuevas. Las ya enviadas conservan
					lo que se registró.
				</p>
			</div>
		</main>
	);
}

function dayCount(days: number) {
	return `${days} ${days === 1 ? "día" : "días"}`;
}
