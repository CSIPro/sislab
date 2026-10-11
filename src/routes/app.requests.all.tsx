import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Clock, Download } from "lucide-react";
import { Fragment, useState } from "react";
import { OptionSelect } from "../components/option-select.tsx";
import {
	RequestDetails,
	StatusChip,
	statusFilterOptions,
	voidedByName,
} from "../components/request-parts.tsx";
import { TableShell } from "../components/table-shell.tsx";
import { Combobox } from "../components/ui/combobox.tsx";
import { DatePicker } from "../components/ui/date-picker.tsx";
import {
	canDecideLateException,
	requestStatusKey,
} from "../lib/preparation-request-status.ts";
import {
	addDays,
	formatDateSpan,
	formatSessionDate,
	groupLabel,
	sislabToday,
	timeRange,
	weekRange,
} from "../lib/session-dates.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	decideLateExceptionFn,
	getDailyTicketRequestsFn,
	listAllPreparationRequestsFn,
	voidPreparationRequestFn,
} from "../server/preparation-request-functions.ts";
import type { RequestListRow } from "../server/preparation-requests.ts";

type Range = "day" | "week";

export const Route = createFileRoute("/app/requests/all")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("staff") && !user.roles.includes("admin"))
			throw redirect({ to: "/app/dashboard" });
		const today = sislabToday();
		const { from, through } = dateRange(today, "week");
		return {
			today,
			requests: await listAllPreparationRequestsFn({
				data: { fromDate: from, throughDate: through },
			}),
		};
	},
	component: AllPreparationRequestsPage,
	errorComponent: ({ reset }) => (
		<main className="app-page">
			<div className="app-page-inner is-compact">
				<header className="page-head-copy">
					<h1 className="page-title">No se pudieron cargar las solicitudes</h1>
					<p className="page-sub">
						Inténtalo de nuevo. Si el problema continúa, contacta al
						administrador.
					</p>
				</header>
				<div>
					<button className="button-primary" onClick={reset} type="button">
						Intentar de nuevo
					</button>
				</div>
			</div>
		</main>
	),
});

function AllPreparationRequestsPage() {
	const initial = Route.useLoaderData();
	const { periodCode } = Route.useRouteContext();
	const [requests, setRequests] = useState(initial.requests);
	const [date, setDate] = useState(initial.today);
	const [range, setRange] = useState<Range>("week");
	const [labFilter, setLabFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [message, setMessage] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);
	const labs = [
		...new Set(requests.map(({ request }) => request.labName)),
	].sort((a, b) => a.localeCompare(b, "es-MX"));
	const filtered = requests.filter(
		({ request }) =>
			(labFilter === "all" || request.labName === labFilter) &&
			(statusFilter === "all" || requestStatusKey(request) === statusFilter),
	);
	const pending = requests.filter(({ request }) =>
		canDecideLateException(request),
	).length;
	const selected = dateRange(date, range);
	const rangeLabel = range === "day" ? "Día" : "Semana";

	async function show(nextDate: string, nextRange: Range) {
		setDate(nextDate);
		setRange(nextRange);
		setMessage("");
		const next = dateRange(nextDate, nextRange);
		try {
			setRequests(
				await listAllPreparationRequestsFn({
					data: { fromDate: next.from, throughDate: next.through },
				}),
			);
		} catch (error) {
			setMessage(
				userFacingError(error, "No se pudieron cargar las solicitudes."),
			);
		}
	}

	async function act(
		requestId: string,
		fallback: string,
		action: () => Promise<unknown>,
	) {
		setBusyId(requestId);
		setMessage("");
		try {
			await action();
			await show(date, range);
		} catch (error) {
			setMessage(
				userFacingError(
					error,
					error instanceof Error ? error.message : fallback,
				),
			);
		} finally {
			setBusyId(null);
		}
	}

	const decide = (requestId: string, decision: "accepted" | "declined") =>
		act(requestId, "No se pudo guardar la decisión.", () =>
			decideLateExceptionFn({ data: { requestId, decision } }),
		);
	const voidRequest = (requestId: string, reason: string) =>
		act(requestId, "No se pudo anular la solicitud.", () =>
			voidPreparationRequestFn({ data: { requestId, reason } }),
		);

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
		<main className="app-page">
			<div className="app-page-inner is-compact">
				<header className="page-head">
					<div className="page-head-copy">
						<h1 className="page-title">Todas las solicitudes</h1>
						<p className="page-sub">
							{range === "day"
								? formatSessionDate(date, "full")
								: `Semana del ${formatDateSpan(selected.from, selected.through)}`}
							{periodCode && ` · Período ${periodCode}`}
						</p>
					</div>
					<button
						className="button-primary"
						onClick={printTicket}
						type="button"
					>
						<Download aria-hidden="true" size={18} strokeWidth={2} />
						Ticket del{" "}
						{formatSessionDate(date, "weekdayDay").toLocaleLowerCase("es-MX")}{" "}
						(PDF)
					</button>
				</header>

				{pending > 0 && (
					<output className="notice notice-warning">
						<Clock aria-hidden="true" size={20} strokeWidth={2} />
						<p>
							<strong>
								{pending}{" "}
								{pending === 1
									? "excepción por decidir."
									: "excepciones por decidir."}
							</strong>{" "}
							{pending === 1
								? "Mientras no la aceptes, queda fuera del ticket del día."
								: "Mientras no las aceptes, quedan fuera del ticket del día."}
						</p>
					</output>
				)}

				<div className="toolbar">
					<div className="toolbar-group">
						{/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add a legend the design does not have */}
						<div aria-label="Vista" className="seg-group" role="group">
							<button
								aria-pressed={range === "day"}
								className="seg"
								onClick={() => void show(date, "day")}
								type="button"
							>
								Día
							</button>
							<button
								aria-pressed={range === "week"}
								className="seg"
								onClick={() => void show(date, "week")}
								type="button"
							>
								Semana
							</button>
						</div>
						<button
							aria-label={`${rangeLabel} anterior`}
							className="button-secondary button-sm button-icon"
							onClick={() =>
								void show(addDays(date, range === "day" ? -1 : -7), range)
							}
							type="button"
						>
							<ChevronLeft aria-hidden="true" size={18} />
						</button>
						<button
							aria-label={`${rangeLabel} siguiente`}
							className="button-secondary button-sm button-icon"
							onClick={() =>
								void show(addDays(date, range === "day" ? 1 : 7), range)
							}
							type="button"
						>
							<ChevronRight aria-hidden="true" size={18} />
						</button>
						<DatePicker
							aria-label="Fecha"
							className="field-outline"
							onValueChange={(value) => void show(value, range)}
							value={date}
						/>
					</div>
					<div className="toolbar-group">
						<label htmlFor="all-requests-lab">Laboratorio</label>
						<Combobox
							className="field-outline"
							emptyText="Ningún laboratorio coincide."
							id="all-requests-lab"
							onValueChange={setLabFilter}
							options={[
								{ value: "all", label: "Todos" },
								...(labFilter !== "all" && !labs.includes(labFilter)
									? [{ value: labFilter, label: labFilter }]
									: []),
								...labs.map((lab) => ({ value: lab, label: lab })),
							]}
							searchPlaceholder="Buscar laboratorio"
							value={labFilter}
						/>
						<label htmlFor="all-requests-status">Estado</label>
						<OptionSelect
							id="all-requests-status"
							onValueChange={setStatusFilter}
							options={statusFilterOptions}
							value={statusFilter}
						/>
					</div>
				</div>

				{message && (
					<p className="notice notice-error" role="alert">
						{message}
					</p>
				)}

				<TableShell>
					<table className="data-table" style={{ minWidth: 1080 }}>
						<thead>
							<tr>
								<th scope="col">Fecha y hora</th>
								<th scope="col">Práctica</th>
								<th scope="col">Profesor</th>
								<th scope="col">Grupo</th>
								<th scope="col">Lab.</th>
								<th scope="col">Estado</th>
								<th scope="col">Acciones</th>
							</tr>
						</thead>
						<tbody>
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
						<p className="table-empty">No hay solicitudes en estas fechas.</p>
					)}
				</TableShell>

				<p className="footnote">
					El ticket incluye las solicitudes ordinarias y las excepciones
					aceptadas del día. Las excepciones sin decisión, las rechazadas y las
					anuladas no aparecen.
				</p>
			</div>
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
	const [panel, setPanel] = useState<"details" | "void" | null>(null);
	const voided = request.status === "voided";
	const toggle = (next: "details" | "void") =>
		setPanel((current) => (current === next ? null : next));
	return (
		<Fragment>
			<tr className={voided ? "is-void" : undefined}>
				<td>
					<strong>{formatSessionDate(request.sessionDate, "short")}</strong>
					<small>{timeRange(request.startTime, request.endTime)}</small>
				</td>
				<td>
					{request.exerciseName}
					{voided ? (
						<small className="cell-note">
							Anulada por {voidedByName(item)}
							{request.voidedAt &&
								`, ${formatSessionDate(sislabToday(new Date(request.voidedAt)), "dayMonth")}`}
							.
						</small>
					) : (
						request.lateReason && (
							<small className="cell-note">Motivo: {request.lateReason}</small>
						)
					)}
				</td>
				<td>
					{professor.name} {professor.surname}
				</td>
				<td>
					{group.subjectName} · {groupLabel(group.number)}
				</td>
				<td className="whitespace-nowrap">{request.labName}</td>
				<td>
					<StatusChip request={request} />
				</td>
				<td>
					<div className="row-actions">
						{canDecideLateException(request) && (
							<>
								<button
									className="button-primary button-sm"
									disabled={busy}
									onClick={() => onDecide(request.id, "accepted")}
									type="button"
								>
									Aceptar
								</button>
								<button
									className="button-secondary button-sm"
									disabled={busy}
									onClick={() => onDecide(request.id, "declined")}
									type="button"
								>
									Rechazar
								</button>
							</>
						)}
						<button
							aria-expanded={panel === "details"}
							className="button-secondary button-sm"
							onClick={() => toggle("details")}
							type="button"
						>
							Ver
						</button>
						{!voided && (
							<button
								aria-expanded={panel === "void"}
								className="button-secondary button-sm button-danger"
								disabled={busy}
								onClick={() => toggle("void")}
								type="button"
							>
								Anular
							</button>
						)}
					</div>
				</td>
			</tr>
			{panel === "details" && (
				<tr className="detail-row">
					<td colSpan={7}>
						<RequestDetails item={item} />
					</td>
				</tr>
			)}
			{panel === "void" && !voided && (
				<tr className="detail-row">
					<td colSpan={7}>
						<form
							className="stack"
							onSubmit={(event) => {
								event.preventDefault();
								onVoid(request.id, reason);
							}}
							style={{ maxWidth: 600 }}
						>
							<label className="field-label">
								Motivo de la anulación
								<textarea
									className="field"
									onChange={(event) => setReason(event.target.value)}
									required
									value={reason}
								/>
							</label>
							<div>
								<button
									className="button-secondary button-sm button-danger"
									disabled={busy || !reason.trim()}
									type="submit"
								>
									Confirmar anulación
								</button>
							</div>
						</form>
					</td>
				</tr>
			)}
		</Fragment>
	);
}

function dateRange(value: string, range: Range) {
	return range === "day" ? { from: value, through: value } : weekRange(value);
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
	return `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap"><title>Ticket diario · ${escapeHtml(date)}</title><style>@page{size:80mm auto;margin:4mm}*{box-sizing:border-box}body{width:72mm;margin:0 auto;font:12px/1.35 Inconsolata,monospace;color:#181818}h1{font-size:18px;text-align:center;margin:0 0 4px}h2{font-size:14px;margin:12px 0 4px}.date{text-align:center;margin:0 0 10px}.ticket-group{border-top:1px dashed #444;padding:3px 0 7px}.ticket-group p{margin:3px 0}ul{margin:3px 0 8px;padding-left:15px}li{margin:2px 0}.totals{border-top:2px solid #181818;margin-top:8px;padding-top:4px}@media screen{body{margin:20px auto}}@media print{body{margin:0 auto}}</style></head><body><h1>SISLAB</h1><p class="date">Ticket de preparación · ${escapeHtml(formatDate(date))}<br/>${rows.length} solicitudes</p>${groupsHtml}${rows.length ? `<section class="totals"><h2>Totales por material</h2>${totals}</section>` : "<p>No hay solicitudes elegibles para esta fecha.</p>"}<script>window.addEventListener('load',()=>window.print())</script></body></html>`;
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
