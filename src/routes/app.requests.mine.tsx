import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
	requestStatusKey,
	requestStatusLabel,
} from "../lib/preparation-request-status.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import { listMyPreparationRequestsFn } from "../server/preparation-request-functions.ts";
import type { RequestListRow } from "../server/preparation-requests.ts";

export const Route = createFileRoute("/app/requests/mine")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("professor"))
			throw redirect({ to: "/app/dashboard" });
		return listMyPreparationRequestsFn();
	},
	component: MyPreparationRequestsPage,
	errorComponent: ({ reset }) => (
		<main className="page-wrap px-4 py-10 sm:py-12">
			<section className="island-shell mx-auto max-w-6xl rounded-2xl p-5 sm:p-8">
				<h1 className="display-title text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
					No se pudieron cargar tus solicitudes
				</h1>
				<p className="mt-2 text-[var(--muted-foreground)]">
					Inténtalo de nuevo. Si el problema continúa, contacta al personal de
					laboratorio.
				</p>
				<button className="button-primary mt-5" onClick={reset} type="button">
					Intentar de nuevo
				</button>
			</section>
		</main>
	),
});

function MyPreparationRequestsPage() {
	const requests = Route.useLoaderData();
	const [state, setState] = useState("all");
	const visible = requests.filter(
		({ request }) => state === "all" || requestStatusKey(request) === state,
	);

	return (
		<main className="page-wrap px-4 py-10 sm:py-12">
			<section className="island-shell mx-auto max-w-6xl rounded-2xl p-5 sm:p-8">
				<header className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="display-title text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
							Mis solicitudes
						</h1>
						<p className="mt-2 text-[var(--muted-foreground)]">
							Consulta tus solicitudes actuales e históricas por fecha.
						</p>
					</div>
					<Link className="button-primary" to="/app/requests/new">
						Nueva solicitud
					</Link>
				</header>
				<div className="mt-7 flex flex-wrap items-end gap-4 rounded-xl border border-[var(--border)] p-4">
					<label className="grid gap-1 text-sm font-semibold">
						Estado
						<select
							className="min-w-52 rounded-lg bg-[var(--secondary)] px-3 py-2 font-normal"
							onChange={(event) => setState(event.target.value)}
							value={state}
						>
							<option value="all">Todos</option>
							<option value="open">Abierta</option>
							<option value="pending">Pendiente de excepción</option>
							<option value="accepted">Excepción aceptada</option>
							<option value="declined">Excepción rechazada</option>
							<option value="voided">Anulada</option>
						</select>
					</label>
					<span className="ml-auto text-sm text-[var(--muted-foreground)]">
						{visible.length}{" "}
						{visible.length === 1 ? "solicitud" : "solicitudes"}
					</span>
				</div>
				<div className="mt-5 overflow-x-auto rounded-xl border border-[var(--border)]">
					<table className="w-full min-w-[780px] text-left text-sm tabular-nums">
						<thead className="bg-[var(--secondary)] font-mono text-xs">
							<tr>
								{[
									"Fecha",
									"Ejercicio",
									"Grupo",
									"Laboratorio y horario",
									"Estado",
									"Detalle",
								].map((heading) => (
									<th className="px-4 py-3" key={heading}>
										{heading}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--border)]">
							{visible.map((item) => (
								<MyRequestRow item={item} key={item.request.id} />
							))}
						</tbody>
					</table>
					{visible.length === 0 && (
						<p className="p-8 text-center text-[var(--muted-foreground)]">
							No hay solicitudes para este estado.
						</p>
					)}
				</div>
				<p className="mt-5 text-sm text-[var(--muted-foreground)]">
					Las solicitudes enviadas son de solo lectura. Si una solicitud fue
					anulada, puedes crear otra para la misma fecha.
				</p>
			</section>
		</main>
	);
}

function MyRequestRow({ item }: { item: RequestListRow }) {
	const { request, group } = item;
	return (
		<tr className="align-top">
			<td className="whitespace-nowrap px-4 py-5">
				{formatDate(request.sessionDate)}
			</td>
			<td className="px-4 py-5">
				<strong className="text-[var(--primary-text)]">
					{request.exerciseNumber} · {request.exerciseName}
				</strong>
			</td>
			<td className="px-4 py-5">Grupo {group.number}</td>
			<td className="px-4 py-5">
				{request.labName} · {request.startTime.slice(0, 5)}–
				{request.endTime.slice(0, 5)}
			</td>
			<td className="px-4 py-5">
				<Status status={requestStatusLabel(request)} />
			</td>
			<td className="px-4 py-5">
				<details className="min-w-48">
					<summary className="cursor-pointer font-semibold text-[var(--primary-text)]">
						Ver detalle
					</summary>
					<RequestDetails item={item} />
				</details>
			</td>
		</tr>
	);
}

function RequestDetails({ item }: { item: RequestListRow }) {
	const { request } = item;
	const materials = request.materials;
	return (
		<div className="absolute z-10 mt-2 max-h-[70vh] w-[min(88vw,36rem)] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg">
			<dl className="grid gap-3 sm:grid-cols-2">
				<div>
					<dt className="text-xs text-[var(--muted-foreground)]">
						Fecha de envío
					</dt>
					<dd>{formatDateTime(request.createdAt)}</dd>
				</div>
				<div>
					<dt className="text-xs text-[var(--muted-foreground)]">Nota</dt>
					<dd>{request.professorNote || "Sin nota"}</dd>
				</div>
			</dl>
			<MaterialList materials={materials} />
			{request.lateReason && (
				<p className="mt-3 rounded-lg bg-[var(--secondary)] p-3 text-sm">
					<strong>Motivo de excepción:</strong> {request.lateReason}
				</p>
			)}
			{request.status === "voided" && (
				<p className="mt-3 rounded-lg bg-[var(--destructive)]/10 p-3 text-sm">
					<strong>
						Anulada por{" "}
						{item.voidedBy
							? `${item.voidedBy.name} ${item.voidedBy.surname}`
							: "personal de laboratorio"}
					</strong>
					{request.voidedAt && ` · ${formatDateTime(request.voidedAt)}`}
					<br />
					{request.voidReason}
				</p>
			)}
		</div>
	);
}

export function MaterialList({
	materials,
}: {
	materials: RequestListRow["request"]["materials"];
}) {
	const sections: Array<[string, string[]]> = [
		[
			"Reactivos",
			materials.reagents.map(
				(item) => `${item.name}: ${item.totalAmount} ${item.unit}`,
			),
		],
		[
			"Equipo",
			materials.equipment.map(
				(item) => `${item.name}: ${item.totalAmount} ${item.unit}`,
			),
		],
		["Reactivos omitidos", materials.omittedReagents],
		[
			"Materiales añadidos",
			[
				...materials.addedReagents.map(
					(item) => `${item.name}: ${item.totalAmount} ${item.unit}`,
				),
				...materials.addedEquipment.map(
					(item) => `${item.name}: ${item.totalAmount} ${item.unit}`,
				),
			],
		],
	];
	return (
		<div className="mt-4 grid gap-4 sm:grid-cols-2">
			{sections.map(([heading, entries]) => (
				<section key={heading}>
					<h3 className="text-sm font-bold">{heading}</h3>
					{entries.length ? (
						<ul className="mt-1 list-inside list-disc text-sm">
							{entries.map((entry) => (
								<li key={`${heading}-${entry}`}>{entry}</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-[var(--muted-foreground)]">Ninguno</p>
					)}
				</section>
			))}
			<section className="sm:col-span-2">
				<h3 className="text-sm font-bold">Residuos esperados</h3>
				{materials.waste.length ? (
					<ul className="mt-1 list-inside list-disc text-sm">
						{materials.waste.map((item) => (
							<li
								key={`waste-${item.name}-${item.container}-${item.treatment}`}
							>
								{item.name} · {item.container} · {item.treatment}
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-[var(--muted-foreground)]">Ninguno</p>
				)}
			</section>
			{materials.addedWaste.length > 0 && (
				<section className="sm:col-span-2">
					<h3 className="text-sm font-bold">Residuos añadidos</h3>
					<ul className="mt-1 list-inside list-disc text-sm">
						{materials.addedWaste.map((item) => (
							<li
								key={`extra-waste-${item.name}-${item.container}-${item.treatment}`}
							>
								{item.name} · {item.container} · {item.treatment}
							</li>
						))}
					</ul>
				</section>
			)}
		</div>
	);
}

export function Status({ status }: { status: string }) {
	const colors: Record<string, string> = {
		Abierta: "bg-[var(--success)]/15 text-[var(--foreground)]",
		"Pendiente de excepción": "bg-[var(--warning)] text-[var(--foreground)]",
		"Excepción aceptada": "bg-[var(--info)]/15 text-[var(--foreground)]",
		"Excepción rechazada":
			"bg-[var(--destructive)]/10 text-[var(--foreground)]",
		Anulada: "bg-[var(--destructive)]/10 text-[var(--foreground)]",
	};
	return (
		<span
			className={`inline-flex rounded-sm px-2 py-1 text-xs font-bold ${colors[status] ?? "bg-[var(--secondary)]"}`}
		>
			{status}
		</span>
	);
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat("es-MX", {
		timeZone: "UTC",
		weekday: "short",
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(`${value}T12:00:00Z`));
}
function formatDateTime(value: Date) {
	return new Intl.DateTimeFormat("es-MX", {
		timeZone: "America/Hermosillo",
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
