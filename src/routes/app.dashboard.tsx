import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, Clock, MapPin, Plus } from "lucide-react";
import { StatusChip } from "../components/request-parts.tsx";
import {
	addDays,
	formatSessionDate,
	groupLabel,
	sislabToday,
	timeRange,
} from "../lib/session-dates.ts";
import { weekdays } from "../lib/weekdays.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import { listMyGroupsFn } from "../server/group-management-functions.ts";
import {
	listAllPreparationRequestsFn,
	listMyPreparationRequestsFn,
} from "../server/preparation-request-functions.ts";
import type { RequestListRow } from "../server/preparation-requests.ts";

const UPCOMING_REQUESTS = 4;
const STAFF_WINDOW_DAYS = 7;

export const Route = createFileRoute("/app/dashboard")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		const today = sislabToday();
		const isProfessor = user.roles.includes("professor");
		const isStaff =
			user.roles.includes("staff") || user.roles.includes("admin");

		const [groups, myRequests, allRequests] = await Promise.all([
			isProfessor ? listMyGroupsFn({ data: { includeInactive: false } }) : [],
			isProfessor ? listMyPreparationRequestsFn() : [],
			isStaff
				? listAllPreparationRequestsFn({
						data: {
							fromDate: today,
							throughDate: addDays(today, STAFF_WINDOW_DAYS - 1),
						},
					})
				: [],
		]);

		return {
			user,
			today,
			groups,
			myRequests: myRequests
				.filter(({ request }) => request.sessionDate >= today)
				.slice(0, UPCOMING_REQUESTS),
			allRequests,
		};
	},
	component: DashboardPage,
});

function DashboardPage() {
	const { user, today, groups, myRequests, allRequests } =
		Route.useLoaderData();
	const { periodCode } = Route.useRouteContext();
	const isProfessor = user.roles.includes("professor");
	const isAdmin = user.roles.includes("admin");
	const isStaff = isAdmin || user.roles.includes("staff");
	const scope =
		isProfessor && isStaff
			? "en tus laboratorios y en los de todos"
			: isProfessor
				? "en tus laboratorios"
				: "en los laboratorios";

	return (
		<main className="app-page">
			<div className="app-page-inner">
				<header className="page-head">
					<div className="page-head-copy">
						<h1 className="page-title">Tablero</h1>
						<p className="page-sub">
							{formatSessionDate(today, "full")} · Hola, {user.name}. Esto es lo
							que viene {scope}.
						</p>
					</div>
					<div className="page-actions">
						{periodCode && (
							<span className="period-chip">Periodo {periodCode}</span>
						)}
						{isProfessor && (
							<Link className="button-primary" to="/app/requests/new">
								<Plus aria-hidden="true" size={18} strokeWidth={2} />
								Nueva solicitud
							</Link>
						)}
					</div>
				</header>

				{isProfessor && (
					<div className="split">
						<section
							aria-labelledby="dashboard-requests-title"
							className="panel split-main"
						>
							<div className="panel-head">
								<h2 className="panel-title" id="dashboard-requests-title">
									Mis próximas solicitudes
								</h2>
								<Link className="text-link" to="/app/requests/mine">
									Ver todas
								</Link>
							</div>
							{myRequests.length === 0 ? (
								<p className="empty-state">
									No tienes solicitudes próximas.{" "}
									<Link to="/app/requests/new">Crea tu solicitud</Link>
								</p>
							) : (
								<div className="stack">
									{myRequests.map((item) => (
										<UpcomingRequest item={item} key={item.request.id} />
									))}
								</div>
							)}
						</section>

						<section
							aria-labelledby="dashboard-groups-title"
							className="panel split-side"
						>
							<div className="panel-head">
								<h2 className="panel-title" id="dashboard-groups-title">
									Mis grupos
								</h2>
								<Link className="text-link" to="/app/groups/manage">
									Ver todos
								</Link>
							</div>
							{groups.length === 0 ? (
								<p className="empty-state">
									Aún no tienes grupos activos.{" "}
									<Link to="/app/groups/new">Registra tu primer grupo</Link>
								</p>
							) : (
								<div className="stack">
									{groups.map((group) => (
										<Link
											className="row-card is-stacked"
											key={group.id}
											to="/app/groups/manage"
										>
											<span className="row-heading">
												<strong>{group.subjectName}</strong>
												<span>{groupLabel(group.number)}</span>
											</span>
											<span className="icon-line">
												<CalendarDays
													aria-hidden="true"
													size={16}
													strokeWidth={1.75}
												/>
												{weekdays[group.weekday]},{" "}
												{timeRange(group.startTime, group.endTime)}
											</span>
											<span className="icon-line">
												<MapPin
													aria-hidden="true"
													size={16}
													strokeWidth={1.75}
												/>
												Laboratorio {group.labName}
											</span>
										</Link>
									))}
								</div>
							)}
						</section>
					</div>
				)}

				{isStaff && (
					<section
						aria-labelledby="dashboard-all-title"
						className="stack-section"
					>
						<div className="panel-head">
							<div>
								<span className="section-eyebrow">
									{isAdmin ? "Administración" : "Laboratorio"}
								</span>
								<h2 className="panel-title" id="dashboard-all-title">
									Solicitudes próximas de todos los profesores
								</h2>
							</div>
							<Link className="text-link" to="/app/requests/all">
								Abrir la vista completa
							</Link>
						</div>
						<div className="table-shell">
							<table className="data-table" style={{ minWidth: 920 }}>
								<thead>
									<tr>
										<th scope="col">Fecha y hora</th>
										<th scope="col">Ejercicio</th>
										<th scope="col">Profesor</th>
										<th scope="col">Grupo</th>
										<th scope="col">Lab.</th>
										<th scope="col">Estado</th>
									</tr>
								</thead>
								<tbody>
									{allRequests.map(({ request, group, professor }) => (
										<tr key={request.id}>
											<td>
												<strong>
													{formatSessionDate(request.sessionDate, "short")}
												</strong>
												<small>
													{timeRange(request.startTime, request.endTime)}
												</small>
											</td>
											<td>{request.exerciseName}</td>
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
										</tr>
									))}
								</tbody>
							</table>
							{allRequests.length === 0 && (
								<p className="table-empty">
									No hay solicitudes en los próximos {STAFF_WINDOW_DAYS} días.
								</p>
							)}
						</div>
					</section>
				)}
			</div>
		</main>
	);
}

function UpcomingRequest({ item }: { item: RequestListRow }) {
	const { request, group } = item;
	return (
		<Link className="row-card" to="/app/requests/mine">
			<span aria-hidden="true" className="date-tile">
				<span>{formatSessionDate(request.sessionDate, "weekdayShort")}</span>
				<strong>{Number(request.sessionDate.slice(8))}</strong>
			</span>
			<span className="row-copy">
				<span className="sr-only">
					{formatSessionDate(request.sessionDate, "long")}
				</span>
				<strong>{request.exerciseName}</strong>
				<span className="row-group">
					{group.subjectName} · {groupLabel(group.number)}
				</span>
				<span className="row-meta">
					<span>
						<Clock aria-hidden="true" size={15} strokeWidth={1.75} />
						{timeRange(request.startTime, request.endTime)}
					</span>
					<span>
						<MapPin aria-hidden="true" size={15} strokeWidth={1.75} />
						{request.labName}
					</span>
				</span>
			</span>
			<StatusChip request={request} withIcon />
			<ChevronRight aria-hidden="true" size={18} />
		</Link>
	);
}
