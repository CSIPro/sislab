import { createFileRoute, redirect } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ActionNotice, type NoticeState } from "../components/notice.tsx";
import { Footnote, Page, PageHeader } from "../components/page.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardFooter, CardTitle } from "../components/ui/card.tsx";
import {
	Field,
	FieldDescription,
	FieldLabel,
} from "../components/ui/field.tsx";
import { Input } from "../components/ui/input.tsx";
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
	const [notice, setNotice] = useState<NoticeState>(null);
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
		<Page size="form">
			<PageHeader
				description="Ajustes generales de SISLAB para administración."
				title="Configuración"
			/>

			<Card asChild className="gap-7 p-7 max-md:p-5">
				<form onSubmit={save}>
					<div className="flex flex-col gap-1.5">
						<CardTitle>Aviso mínimo para solicitudes</CardTitle>
						<p className="text-pretty text-muted-foreground">
							Días de calendario que deben pasar entre el envío de una solicitud
							de preparación y la fecha de la práctica. Con menos aviso, el
							profesor debe explicar el motivo y el personal decide si la
							acepta.
						</p>
					</div>

					<Field className="gap-2">
						<FieldLabel htmlFor="min-notice-days">Días de aviso</FieldLabel>
						<div className="flex items-center gap-2.5">
							<Button
								aria-label="Restar un día"
								className="size-12"
								disabled={days <= 0}
								onClick={() => setDays(Math.max(0, days - 1))}
								size="icon"
								variant="outline"
							>
								<Minus aria-hidden="true" size={20} />
							</Button>
							<Input
								className="w-24 px-0 text-center text-xl font-bold"
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
								variant="filled"
							/>
							<Button
								aria-label="Sumar un día"
								className="size-12"
								disabled={days >= MAX_NOTICE_DAYS}
								onClick={() => setDays(days + 1)}
								size="icon"
								variant="outline"
							>
								<Plus aria-hidden="true" size={20} />
							</Button>
							<span className="text-[15px] text-muted-foreground">
								{days === 1 ? "día" : "días"}
							</span>
						</div>
						<FieldDescription>
							Valor inicial: {dayCount(DEFAULT_NOTICE_DAYS)}. Las fechas usan la
							zona horaria America/Hermosillo.
						</FieldDescription>
					</Field>

					<div className="flex flex-col gap-3.5 rounded-lg border bg-background px-5 py-[18px] text-[15px]">
						<h3 className="font-bold">
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
								<div
									className="flex min-h-9 flex-wrap items-center justify-between gap-3 border-t pt-2.5"
									key={ahead}
								>
									<span>
										{formatSessionDate(addDays(today, ahead), "long")}{" "}
										<span className="text-muted-foreground">
											· {dayCount(ahead)}
										</span>
									</span>
									<Badge variant={ahead < days ? "warning" : "success"}>
										{ahead < days ? "Requiere motivo" : "Con aviso suficiente"}
									</Badge>
								</div>
							))}
						</div>
					</div>

					<ActionNotice notice={notice} />

					<CardFooter className="pt-6">
						<Button disabled={busy} size="lg" type="submit">
							{busy ? "Guardando…" : "Guardar cambios"}
						</Button>
						<Button
							disabled={busy || days === DEFAULT_NOTICE_DAYS}
							onClick={() => setDays(DEFAULT_NOTICE_DAYS)}
							size="lg"
							variant="outline"
						>
							Restablecer a {dayCount(DEFAULT_NOTICE_DAYS)}
						</Button>
					</CardFooter>
				</form>
			</Card>

			<Footnote>
				El cambio aplica a las solicitudes nuevas. Las ya enviadas conservan lo
				que se registró.
			</Footnote>
		</Page>
	);
}

function dayCount(days: number) {
	return `${days} ${days === 1 ? "día" : "días"}`;
}
