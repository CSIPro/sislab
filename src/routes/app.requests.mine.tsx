import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Fragment, useState } from "react";
import {
	RequestDetails,
	StatusChip,
	statusFilterOptions,
} from "../components/request-parts.tsx";
import { requestStatusKey } from "../lib/preparation-request-status.ts";
import {
	formatSessionDate,
	groupLabel,
	timeRange,
} from "../lib/session-dates.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import { listMyPreparationRequestsFn } from "../server/preparation-request-functions.ts";

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
		<main className="app-page">
			<div className="app-page-inner is-compact">
				<header className="page-head-copy">
					<h1 className="page-title">No se pudieron cargar tus solicitudes</h1>
					<p className="page-sub">
						Inténtalo de nuevo. Si el problema continúa, contacta al personal de
						laboratorio.
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

function MyPreparationRequestsPage() {
	const requests = Route.useLoaderData();
	const { periodCode } = Route.useRouteContext();
	const [state, setState] = useState("all");
	const [openId, setOpenId] = useState<string | null>(null);
	const visible = requests.filter(
		({ request }) => state === "all" || requestStatusKey(request) === state,
	);

	return (
		<main className="app-page">
			<div className="app-page-inner is-compact">
				<header className="page-head">
					<div className="page-head-copy">
						<h1 className="page-title">Mis solicitudes</h1>
						<p className="page-sub">
							{periodCode && `Periodo ${periodCode} · `}
							{visible.length}{" "}
							{visible.length === 1 ? "solicitud" : "solicitudes"}
						</p>
					</div>
					<Link className="button-primary" to="/app/requests/new">
						<Plus aria-hidden="true" size={18} strokeWidth={2} />
						Nueva solicitud
					</Link>
				</header>

				<div className="toolbar">
					<div className="toolbar-group">
						<label htmlFor="my-requests-status">Estado</label>
						<select
							className="field-outline"
							id="my-requests-status"
							onChange={(event) => setState(event.target.value)}
							value={state}
						>
							{statusFilterOptions.map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="table-shell">
					<table className="data-table" style={{ minWidth: 820 }}>
						<thead>
							<tr>
								<th scope="col">Fecha y hora</th>
								<th scope="col">Ejercicio</th>
								<th scope="col">Grupo</th>
								<th scope="col">Lab.</th>
								<th scope="col">Estado</th>
								<th scope="col">Acciones</th>
							</tr>
						</thead>
						<tbody>
							{visible.map((item) => {
								const { request, group } = item;
								const open = openId === request.id;
								return (
									<Fragment key={request.id}>
										<tr
											className={
												request.status === "voided" ? "is-void" : undefined
											}
										>
											<td>
												<strong>
													{formatSessionDate(request.sessionDate, "short")}
												</strong>
												<small>
													{timeRange(request.startTime, request.endTime)}
												</small>
											</td>
											<td>
												{request.exerciseNumber} · {request.exerciseName}
											</td>
											<td>
												{group.subjectName} · {groupLabel(group.number)}
											</td>
											<td className="whitespace-nowrap">{request.labName}</td>
											<td>
												<StatusChip request={request} />
											</td>
											<td>
												<button
													aria-expanded={open}
													className="button-secondary button-sm"
													onClick={() => setOpenId(open ? null : request.id)}
													type="button"
												>
													Ver
												</button>
											</td>
										</tr>
										{open && (
											<tr className="detail-row">
												<td colSpan={6}>
													<RequestDetails item={item} />
												</td>
											</tr>
										)}
									</Fragment>
								);
							})}
						</tbody>
					</table>
					{visible.length === 0 && (
						<p className="table-empty">No hay solicitudes para este estado.</p>
					)}
				</div>

				<p className="footnote">
					Las solicitudes enviadas son de solo lectura. Si una solicitud fue
					anulada, puedes crear otra para la misma fecha.
				</p>
			</div>
		</main>
	);
}
