import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { userFacingError } from "../lib/user-facing-error.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	decideLateExceptionFn,
	getDailyTicketRequestsFn,
	listAllPreparationRequestsFn,
	voidPreparationRequestFn,
} from "../server/preparation-request-functions.ts";
import type { RequestListRow } from "../server/preparation-requests.ts";
import { MaterialList, Status } from "./app.requests.mine.tsx";

const initialDate = new Intl.DateTimeFormat("en-CA", {
	timeZone: "America/Hermosillo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
}).format(new Date());

export const Route = createFileRoute("/app/requests/all")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("staff") && !user.roles.includes("admin"))
			throw redirect({ to: "/app/dashboard" });
		const { from, through } = dateRange(initialDate, "day");
		return {
			user,
			requests: await listAllPreparationRequestsFn({
				data: { fromDate: from, throughDate: through },
			}),
		};
	},
	component: AllPreparationRequestsPage,
});

function AllPreparationRequestsPage() {
	const initial = Route.useLoaderData();
	const [requests, setRequests] = useState(initial.requests);
	const [date, setDate] = useState(initialDate);
	const [range, setRange] = useState<"day" | "week">("day");
	const [statusFilter, setStatusFilter] = useState("all");
	const [message, setMessage] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);
	const filtered = requests.filter(
		({ request }) =>
			statusFilter === "all" || statusKey(request) === statusFilter,
	);

	async function refresh(nextDate = date, nextRange = range) {
		const selected = dateRange(nextDate, nextRange);
		setRequests(
			await listAllPreparationRequestsFn({
				data: { fromDate: selected.from, throughDate: selected.through },
			}),
		);
	}

	async function decide(requestId: string, decision: "accepted" | "declined") {
		setBusyId(requestId);
		setMessage("");
		try {
			await decideLateExceptionFn({ data: { requestId, decision } });
			await refresh();
		} catch (error) {
			setMessage(
				userFacingError(
					error,
					error instanceof Error
						? error.message
						: "No se pudo guardar la decisión.",
				),
			);
		} finally {
			setBusyId(null);
		}
	}

	async function voidRequest(requestId: string, reason: string) {
		setBusyId(requestId);
		setMessage("");
		try {
			await voidPreparationRequestFn({ data: { requestId, reason } });
			await refresh();
		} catch (error) {
			setMessage(
				userFacingError(
					error,
					error instanceof Error
						? error.message
						: "No se pudo anular la solicitud.",
				),
			);
		} finally {
			setBusyId(null);
		}
	}

	async function printTicket() {
		const printWindow = window.open("about:blank", "_blank");
		if (!printWindow) {
			setMessage("Permite las ventanas emergentes para generar el ticket.");
			return;
		}
		setMessage("");
		try {
			const rows = await getDailyTicketRequestsFn({ data: { date } });
			printWindow.document.open();
			printWindow.document.write(buildTicketHtml(rows, date));
			printWindow.document.close();
		} catch (error) {
			printWindow.close();
			setMessage(
				userFacingError(
					error,
					error instanceof Error
						? error.message
						: "No se pudo generar el ticket.",
				),
			);
		}
	}

	return (
		<main className="page-wrap px-4 py-10 sm:py-12">
			<section className="island-shell mx-auto max-w-6xl rounded-2xl p-5 sm:p-8">
				<header className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="display-title text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
							Todas las solicitudes
						</h1>
						<p className="mt-2 text-[var(--muted-foreground)]">
							Consulta solicitudes por día o semana y prepara el ticket diario.
						</p>
					</div>
					<button
						className="rounded-lg bg-[var(--primary)] px-5 py-3 font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-strong)]"
						onClick={printTicket}
						type="button"
					>
						Generar ticket PDF
					</button>
				</header>
				<div className="mt-7 flex flex-wrap items-end gap-4 rounded-xl border border-[var(--border)] p-4">
					<fieldset>
						<legend className="mb-1 text-sm font-semibold">Ver</legend>
						<div className="flex rounded-lg bg-[var(--secondary)] p-1">
							<button
								aria-pressed={range === "day"}
								className={`rounded-md px-4 py-2 text-sm font-semibold ${range === "day" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : ""}`}
								onClick={() => {
									setRange("day");
									void refresh(date, "day");
								}}
								type="button"
							>
								Día
							</button>
							<button
								aria-pressed={range === "week"}
								className={`rounded-md px-4 py-2 text-sm font-semibold ${range === "week" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : ""}`}
								onClick={() => {
									setRange("week");
									void refresh(date, "week");
								}}
								type="button"
							>
								Semana
							</button>
						</div>
					</fieldset>
					<label className="grid gap-1 text-sm font-semibold">
						Fecha
						<input
							className="rounded-lg bg-[var(--secondary)] px-3 py-2 font-normal"
							onChange={(event) => {
								setDate(event.target.value);
								if (event.target.value) void refresh(event.target.value);
							}}
							type="date"
							value={date}
						/>
					</label>
					<label className="grid gap-1 text-sm font-semibold">
						Estado
						<select
							className="min-w-48 rounded-lg bg-[var(--secondary)] px-3 py-2 font-normal"
							onChange={(event) => setStatusFilter(event.target.value)}
							value={statusFilter}
						>
							<option value="all">Todos los estados</option>
							<option value="open">Abierta</option>
							<option value="pending">Pendiente de excepción</option>
							<option value="accepted">Excepción aceptada</option>
							<option value="declined">Excepción rechazada</option>
							<option value="voided">Anulada</option>
						</select>
					</label>
					<span className="ml-auto pb-2 text-sm text-[var(--muted-foreground)]">
						{filtered.length}{" "}
						{filtered.length === 1 ? "solicitud" : "solicitudes"}
					</span>
				</div>
				{message && (
					<p
						className="mt-4 rounded-lg bg-[var(--destructive)]/10 p-3 text-sm font-semibold"
						role="alert"
					>
						{message}
					</p>
				)}
				<div className="mt-5 overflow-x-auto rounded-xl border border-[var(--border)]">
					<table className="w-full min-w-[980px] text-left text-sm tabular-nums">
						<thead className="bg-[var(--secondary)] font-mono text-xs">
							<tr>
								{[
									"Fecha y hora",
									"Ejercicio y grupo",
									"Docente",
									"Laboratorio",
									"Estado",
									"Acción",
								].map((heading) => (
									<th className="px-4 py-3" key={heading}>
										{heading}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--border)]">
							{filtered.map((item) => (
								<StaffRequestRow
									busy={busyId === item.request.id}
									item={item}
									key={item.request.id}
									onDecide={decide}
									onVoid={voidRequest}
								/>
							))}
						</tbody>
					</table>
					{filtered.length === 0 && (
						<p className="p-8 text-center text-[var(--muted-foreground)]">
							No hay solicitudes en este periodo.
						</p>
					)}
				</div>
				<p className="mt-5 rounded-xl bg-[var(--info)]/15 p-4 text-sm text-[var(--foreground)]">
					Las solicitudes abiertas y las excepciones aceptadas aparecen en el
					ticket. Las pendientes, rechazadas y anuladas quedan fuera.
				</p>
			</section>
		</main>
	);
}

function StaffRequestRow({
	item,
	busy,
	onDecide,
	onVoid,
}: {
	item: RequestListRow;
	busy: boolean;
	onDecide: (id: string, decision: "accepted" | "declined") => void;
	onVoid: (id: string, reason: string) => void;
}) {
	const { request, group, professor } = item;
	const [reason, setReason] = useState("");
	const [showVoidForm, setShowVoidForm] = useState(false);
	return (
		<tr className="align-top">
			<td className="whitespace-nowrap px-4 py-5 font-mono">
				{request.sessionDate.slice(5).replace("-", ".")} ·{" "}
				{request.startTime.slice(0, 5)}
			</td>
			<td className="px-4 py-5">
				<strong className="text-[var(--primary-text)]">
					{request.exerciseName} · Grupo {group.number}
				</strong>
				<details className="mt-2">
					<summary className="cursor-pointer text-xs font-semibold text-[var(--primary-text)]">
						Ver detalle
					</summary>
					<RequestDetails item={item} />
				</details>
			</td>
			<td className="px-4 py-5">
				{professor.name} {professor.surname}
			</td>
			<td className="px-4 py-5">{request.labName}</td>
			<td className="px-4 py-5">
				<Status status={requestStatusLabel(request)} />
			</td>
			<td className="px-4 py-5">
				<div className="flex min-w-48 flex-wrap gap-2">
					{canDecide(request) && (
						<>
							<button
								className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary-foreground)] disabled:opacity-50"
								disabled={busy}
								onClick={() => onDecide(request.id, "accepted")}
								type="button"
							>
								Aceptar
							</button>
							<button
								className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold disabled:opacity-50"
								disabled={busy}
								onClick={() => onDecide(request.id, "declined")}
								type="button"
							>
								Rechazar
							</button>
						</>
					)}
					{request.status !== "voided" && (
						<button
							className="text-xs font-semibold text-[var(--destructive)] underline"
							disabled={busy}
							onClick={() => setShowVoidForm((open) => !open)}
							type="button"
						>
							Anular solicitud
						</button>
					)}
				</div>
				{request.status === "voided" && (
					<p className="mt-2 max-w-60 text-xs">
						Motivo: {request.voidReason}
						<br />
						{item.voidedBy &&
							`Anulada por ${item.voidedBy.name} ${item.voidedBy.surname} · `}
						{request.voidedAt && formatDateTime(request.voidedAt)}
					</p>
				)}
				{showVoidForm && (
					<form
						className="mt-3 grid min-w-56 gap-2"
						onSubmit={(event) => {
							event.preventDefault();
							onVoid(request.id, reason);
						}}
					>
						<label className="grid gap-1 text-xs font-semibold">
							Motivo requerido
							<textarea
								className="min-h-20 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 font-normal"
								onChange={(event) => setReason(event.target.value)}
								required
								value={reason}
							/>
						</label>
						<button
							className="w-fit rounded-lg bg-[var(--destructive)] px-3 py-2 text-xs font-bold text-[var(--destructive-foreground)] disabled:opacity-50"
							disabled={busy || !reason.trim()}
							type="submit"
						>
							Confirmar anulación
						</button>
					</form>
				)}
			</td>
		</tr>
	);
}

function RequestDetails({ item }: { item: RequestListRow }) {
	const { request } = item;
	return (
		<div className="mt-2 max-w-[min(80vw,38rem)] rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
			<dl className="grid gap-3 sm:grid-cols-2">
				<div>
					<dt className="text-xs text-[var(--muted-foreground)]">Enviada</dt>
					<dd>{formatDateTime(request.createdAt)}</dd>
				</div>
				<div>
					<dt className="text-xs text-[var(--muted-foreground)]">
						Nota del docente
					</dt>
					<dd>{request.professorNote || "Sin nota"}</dd>
				</div>
			</dl>
			<MaterialList materials={request.materials} />
			{request.lateReason && (
				<p className="mt-3 rounded-lg bg-[var(--secondary)] p-3 text-sm">
					<strong>Motivo de excepción:</strong> {request.lateReason}
				</p>
			)}
			{request.status === "voided" && (
				<p className="mt-3 rounded-lg bg-[var(--destructive)]/10 p-3 text-sm">
					<strong>Motivo de anulación:</strong> {request.voidReason}
					<br />
					{item.voidedBy &&
						`Anulada por ${item.voidedBy.name} ${item.voidedBy.surname} · `}
					{request.voidedAt && formatDateTime(request.voidedAt)}
				</p>
			)}
		</div>
	);
}

function dateRange(value: string, range: "day" | "week") {
	const date = new Date(`${value}T12:00:00Z`);
	if (range === "day") return { from: value, through: value };
	const offset = (date.getUTCDay() + 6) % 7;
	date.setUTCDate(date.getUTCDate() - offset);
	const from = date.toISOString().slice(0, 10);
	date.setUTCDate(date.getUTCDate() + 6);
	return { from, through: date.toISOString().slice(0, 10) };
}

function statusKey(request: RequestListRow["request"]) {
	if (request.status === "voided") return "voided";
	if (request.lateReason && request.lateAcceptedAt) return "accepted";
	if (request.lateReason && request.lateDeclinedAt) return "declined";
	if (request.lateReason) return "pending";
	return "open";
}

function requestStatusLabel(request: RequestListRow["request"]) {
	if (request.status === "voided") return "Anulada";
	if (request.lateReason && request.lateAcceptedAt) return "Excepción aceptada";
	if (request.lateReason && request.lateDeclinedAt)
		return "Excepción rechazada";
	if (request.lateReason) return "Pendiente de excepción";
	return "Abierta";
}

function canDecide(request: RequestListRow["request"]) {
	return (
		request.status !== "voided" &&
		!!request.lateReason &&
		!request.lateAcceptedAt &&
		!request.lateDeclinedAt
	);
}

function buildTicketHtml(rows: RequestListRow[], date: string) {
	const groups = new Map<string, RequestListRow[]>();
	for (const row of rows) {
		const key = `${row.request.exerciseId}|${row.request.professorId}|${row.group.id}`;
		groups.set(key, [...(groups.get(key) ?? []), row]);
	}
	const groupsHtml = [...groups.values()]
		.map(([item]) => {
			const { request, group, professor } = item;
			const materials = request.materials;
			return `<article class="ticket-group"><h2>${escapeHtml(request.exerciseNumber)} · ${escapeHtml(request.exerciseName)}</h2><p><b>${escapeHtml(professor.name)} ${escapeHtml(professor.surname)}</b> · Grupo ${group.number}</p><p>${escapeHtml(request.labName)} · ${escapeHtml(request.startTime.slice(0, 5))}–${escapeHtml(request.endTime.slice(0, 5))}</p>${request.professorNote ? `<p><b>Nota:</b> ${escapeHtml(request.professorNote)}</p>` : ""}${section(
				"Reactivos",
				materials.reagents.map(
					(item) => `${item.name}: ${item.totalAmount} ${item.unit}`,
				),
			)}${section(
				"Reactivos añadidos",
				materials.addedReagents.map(
					(item) => `${item.name}: ${item.totalAmount} ${item.unit}`,
				),
			)}${section("Reactivos omitidos", materials.omittedReagents)}${section(
				"Equipo",
				[...materials.equipment, ...materials.addedEquipment].map(
					(item) => `${item.name}: ${item.totalAmount} ${item.unit}`,
				),
			)}${section(
				"Residuos",
				[...materials.waste, ...materials.addedWaste].map(
					(item) => `${item.name} · ${item.container} · ${item.treatment}`,
				),
			)}</article>`;
		})
		.join("");
	const totals = [
		[
			"Reactivos",
			combine(
				rows.flatMap(({ request }) => [
					...request.materials.reagents,
					...request.materials.addedReagents,
				]),
			),
		],
		[
			"Equipo",
			combine(
				rows.flatMap(({ request }) => [
					...request.materials.equipment,
					...request.materials.addedEquipment,
				]),
			),
		],
	]
		.map(([title, values]) => section(String(title), values as string[]))
		.join("");
	return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ticket diario · ${escapeHtml(date)}</title><style>@page{size:80mm auto;margin:4mm}*{box-sizing:border-box}body{width:72mm;margin:0 auto;font:12px/1.35 Arial,sans-serif;color:#181818}h1{font-size:18px;text-align:center;margin:0 0 4px}h2{font-size:14px;margin:12px 0 4px}.date{text-align:center;margin:0 0 10px}.ticket-group{border-top:1px dashed #444;padding:3px 0 7px}.ticket-group p{margin:3px 0}ul{margin:3px 0 8px;padding-left:15px}li{margin:2px 0}.totals{border-top:2px solid #181818;margin-top:8px;padding-top:4px}@media screen{body{margin:20px auto}}@media print{body{margin:0 auto}}</style></head><body><h1>SISLAB</h1><p class="date">Ticket de preparación · ${escapeHtml(formatDate(date))}<br/>${rows.length} solicitudes</p>${groupsHtml}${rows.length ? `<section class="totals"><h2>Totales por material</h2>${totals}</section>` : "<p>No hay solicitudes elegibles para esta fecha.</p>"}<script>window.addEventListener('load',()=>window.print())</script></body></html>`;
}

function section(title: string, entries: string[]) {
	return entries.length
		? `<section><h2>${escapeHtml(title)}</h2><ul>${entries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul></section>`
		: "";
}
function combine(
	items: Array<{ name: string; totalAmount: number; unit: string }>,
) {
	const totals = new Map<string, number>();
	for (const item of items) {
		const key = `${item.name}|||${item.unit}`;
		totals.set(key, (totals.get(key) ?? 0) + item.totalAmount);
	}
	return [...totals].map(([key, amount]) => {
		const [name, unit] = key.split("|||");
		return `${name}: ${amount} ${unit}`;
	});
}
function escapeHtml(value: string) {
	return value.replace(
		/[&<>"']/g,
		(character) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				character
			] ?? character,
	);
}
function formatDate(value: string) {
	return new Intl.DateTimeFormat("es-MX", {
		timeZone: "UTC",
		dateStyle: "long",
	}).format(new Date(`${value}T12:00:00Z`));
}
function formatDateTime(value: Date) {
	return new Intl.DateTimeFormat("es-MX", {
		timeZone: "America/Hermosillo",
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
