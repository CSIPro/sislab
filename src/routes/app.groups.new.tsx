import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { GroupFields, readGroupFields } from "../components/group-fields.tsx";
import { Notice } from "../components/notice.tsx";
import { Page, PageHeader } from "../components/page.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
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
		if (!user.roles.includes("professor"))
			throw redirect({ to: "/app/dashboard" });
		return getProfessorGroupOptionsFn();
	},
	component: NewGroupPage,
});

function NewGroupPage() {
	const options = Route.useLoaderData();
	const [notice, setNotice] = useState<{
		text: string;
		error: boolean;
	} | null>(null);
	const [busy, setBusy] = useState(false);
	const [formKey, setFormKey] = useState(0);
	const ready =
		options.periods.length > 0 &&
		options.labs.length > 0 &&
		options.careers.length > 0 &&
		options.subjects.length > 0;

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = readGroupFields(new FormData(event.currentTarget));
		setBusy(true);
		setNotice(null);
		try {
			const group = await registerProfessorGroupFn({ data });
			setNotice({
				text: `El grupo ${group.number} se registró en el período ${group.periodCode}.`,
				error: false,
			});
			// A new key remounts the form, which also clears the pickers.
			setFormKey((key) => key + 1);
		} catch (error) {
			setNotice({
				text: userFacingError(
					error,
					"No se pudo registrar el grupo. Inténtalo de nuevo.",
				),
				error: true,
			});
		} finally {
			setBusy(false);
		}
	}

	return (
		<Page size="form">
			<PageHeader
				description="Elige un período disponible y registra el horario de laboratorio asignado a tu grupo. SISLAB no asigna ni reserva horarios. Deja el número de grupo vacío para usar el siguiente número disponible."
				title="Registrar grupo"
			/>

			{options.periods.length === 0 && (
				<Notice tone="warning">
					Aún no hay períodos académicos disponibles. Pide a una persona
					administradora que configure uno.
				</Notice>
			)}
			{options.periods.length > 0 && !ready && (
				<Notice tone="warning">
					Uno o más catálogos no tienen opciones activas. Pide a una persona
					administradora que los complete.
				</Notice>
			)}

			{ready && (
				<Card asChild className="gap-4 p-7 max-md:p-5">
					<form key={formKey} onSubmit={submit}>
						<GroupFields idPrefix="new-group" options={options} />
						<div className="pt-2">
							<Button disabled={busy} size="lg" type="submit">
								{busy ? "Registrando…" : "Registrar grupo"}
							</Button>
						</div>
					</form>
				</Card>
			)}

			{notice && (
				<Notice tone={notice.error ? "error" : "success"}>
					{notice.text}
					{!notice.error && (
						<>
							{" "}
							<Link className="font-bold" to="/app/dashboard">
								Volver al tablero
							</Link>
						</>
					)}
				</Notice>
			)}
		</Page>
	);
}
