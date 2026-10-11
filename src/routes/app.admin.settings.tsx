import { createFileRoute, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { userFacingError } from "../lib/user-facing-error.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	getMinimumNoticeDaysFn,
	saveMinimumNoticeDaysFn,
} from "../server/minimum-notice-functions.ts";

export const Route = createFileRoute("/app/admin/settings")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		return { minNoticeDays: await getMinimumNoticeDaysFn() };
	},
	component: SettingsPage,
});

function SettingsPage() {
	const initial = Route.useLoaderData();
	const [minNoticeDays, setMinNoticeDays] = useState(initial.minNoticeDays);
	const [value, setValue] = useState(String(initial.minNoticeDays));
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setMessage("");
		const parsedValue = Number(value);
		try {
			const savedValue = await saveMinimumNoticeDaysFn({
				data: { minNoticeDays: parsedValue },
			});
			setMinNoticeDays(savedValue);
			setValue(String(savedValue));
			setMessage(
				"Se guardó el aviso mínimo para las solicitudes de preparación.",
			);
		} catch (error) {
			setMessage(userFacingError(error, "No se pudo guardar el aviso mínimo."));
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell max-w-3xl rounded-2xl p-6 sm:p-8">
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--foreground)]">
					Configuración
				</h1>
				<p className="text-[var(--muted-foreground)]">
					Define las reglas generales para las solicitudes de preparación.
				</p>
				<form className="mt-8 grid max-w-xl gap-4" onSubmit={save}>
					<div className="grid gap-2">
						<label className="font-semibold" htmlFor="min-notice-days">
							Aviso mínimo para solicitudes
						</label>
						<p
							className="text-sm text-[var(--muted-foreground)]"
							id="min-notice-help"
						>
							Cantidad de días naturales que deben transcurrir antes de la
							sesión solicitada.
						</p>
						<div className="flex items-center gap-3">
							<input
								aria-describedby="min-notice-help"
								className="w-32 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
								id="min-notice-days"
								max="2147483647"
								min="0"
								name="minNoticeDays"
								onChange={(event) => setValue(event.target.value)}
								required
								step="1"
								type="number"
								value={value}
							/>
							<span className="text-sm text-[var(--muted-foreground)]">
								días naturales
							</span>
						</div>
					</div>
					<p className="text-sm text-[var(--muted-foreground)]">
						Valor actual: {minNoticeDays} {minNoticeDays === 1 ? "día" : "días"}
					</p>
					<button
						className="w-fit rounded-lg bg-[var(--primary)] px-5 py-2.5 font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
						disabled={busy}
						type="submit"
					>
						Guardar cambios
					</button>
				</form>
				{message && <output className="mt-4 text-sm">{message}</output>}
			</section>
		</main>
	);
}
