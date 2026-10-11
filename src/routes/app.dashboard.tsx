import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, Clock, MapPin, Plus } from "lucide-react";
import {
	EmptyState,
	Page,
	PageHeader,
	PeriodPill,
} from "../components/page.tsx";
import { StatusChip } from "../components/request-parts.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardHeader, CardTitle } from "../components/ui/card.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableCellNote,
	TableEmpty,
	TableHead,
	TableHeader,
	TableRow,
} from "../components/ui/table.tsx";
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
		<Page>
			<PageHeader
				description={`${formatSessionDate(today, "full")} · Hola, ${user.name}. Esto es lo que viene ${scope}.`}
				title="Tablero"
			>
				{periodCode && <PeriodPill code={periodCode} />}
				{isProfessor && (
					<Button asChild size="lg">
						<Link to="/app/requests/new">
							<Plus aria-hidden="true" size={18} strokeWidth={2} />
							Nueva solicitud
						</Link>
					</Button>
				)}
			</PageHeader>

			{isProfessor && (
				<div className="flex flex-wrap items-stretch gap-6">
					<Card
						aria-labelledby="dashboard-requests-title"
						className="flex-[1.7_1_460px]"
					>
						<CardHeader>
							<CardTitle id="dashboard-requests-title">
								Mis próximas solicitudes
							</CardTitle>
							<Button asChild size="inline" variant="link">
								<Link to="/app/requests/mine">Ver todas</Link>
							</Button>
						</CardHeader>
						{myRequests.length === 0 ? (
							<EmptyState>
								No tienes solicitudes próximas.{" "}
								<Link to="/app/requests/new">Crea tu solicitud</Link>
							</EmptyState>
						) : (
							<div className="flex flex-col gap-3">
								{myRequests.map((item) => (
									<UpcomingRequest item={item} key={item.request.id} />
								))}
							</div>
						)}
					</Card>

					<Card
						aria-labelledby="dashboard-groups-title"
						className="flex-[1_1_320px] self-start"
					>
						<CardHeader>
							<CardTitle id="dashboard-groups-title">Mis grupos</CardTitle>
							<Button asChild size="inline" variant="link">
								<Link to="/app/groups/manage">Ver todos</Link>
							</Button>
						</CardHeader>
						{groups.length === 0 ? (
							<EmptyState>
								Aún no tienes grupos activos.{" "}
								<Link to="/app/groups/new">Registra tu primer grupo</Link>
							</EmptyState>
						) : (
							<div className="flex flex-col gap-3">
								{groups.map((group) => (
									<Link
										className={`${rowCard} flex-col items-stretch gap-2`}
										key={group.id}
										to="/app/groups/manage"
									>
										<span className="flex items-baseline justify-between gap-2">
											<strong className="text-primary-text">
												{group.subjectName}
											</strong>
											<span className="text-[12.5px] font-bold whitespace-nowrap">
												{groupLabel(group.number)}
											</span>
										</span>
										<span className={iconLine}>
											<CalendarDays
												aria-hidden="true"
												size={16}
												strokeWidth={1.75}
											/>
											{weekdays[group.weekday]},{" "}
											{timeRange(group.startTime, group.endTime)}
										</span>
										<span className={iconLine}>
											<MapPin aria-hidden="true" size={16} strokeWidth={1.75} />
											Laboratorio {group.labName}
										</span>
									</Link>
								))}
							</div>
						)}
					</Card>
				</div>
			)}

			{isStaff && (
				<section
					aria-labelledby="dashboard-all-title"
					className="flex flex-col gap-3.5"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<span className="text-[13.5px] font-bold text-primary-text">
								{isAdmin ? "Administración" : "Laboratorio"}
							</span>
							<h2 className="text-[22px] font-bold" id="dashboard-all-title">
								Solicitudes próximas de todos los profesores
							</h2>
						</div>
						<Button asChild size="inline" variant="link">
							<Link to="/app/requests/all">Abrir la vista completa</Link>
						</Button>
					</div>
					<Table className="min-w-[920px]">
						<TableHeader>
							<TableRow>
								<TableHead>Fecha y hora</TableHead>
								<TableHead>Práctica</TableHead>
								<TableHead>Profesor</TableHead>
								<TableHead>Grupo</TableHead>
								<TableHead>Lab.</TableHead>
								<TableHead>Estado</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{allRequests.map(({ request, group, professor }) => (
								<TableRow key={request.id}>
									<TableCell>
										<strong>
											{formatSessionDate(request.sessionDate, "short")}
										</strong>
										<TableCellNote>
											{timeRange(request.startTime, request.endTime)}
										</TableCellNote>
									</TableCell>
									<TableCell>{request.exerciseName}</TableCell>
									<TableCell>
										{professor.name} {professor.surname}
									</TableCell>
									<TableCell>
										{group.subjectName} · {groupLabel(group.number)}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										{request.labName}
									</TableCell>
									<TableCell>
										<StatusChip request={request} />
									</TableCell>
								</TableRow>
							))}
							{allRequests.length === 0 && (
								<TableEmpty colSpan={6}>
									No hay solicitudes en los próximos {STAFF_WINDOW_DAYS} días.
								</TableEmpty>
							)}
						</TableBody>
					</Table>
				</section>
			)}
		</Page>
	);
}

/** A clickable card for one item in a short list. */
const rowCard =
	"flex items-center gap-3.5 rounded-lg border bg-card px-3.5 py-3 text-foreground no-underline hover:border-accent-border hover:bg-accent hover:text-foreground max-md:flex-wrap";
const iconLine =
	"inline-flex items-center gap-1.5 text-sm text-muted-foreground";

function UpcomingRequest({ item }: { item: RequestListRow }) {
	const { request, group } = item;
	return (
		<Link className={rowCard} to="/app/requests/mine">
			<span
				aria-hidden="true"
				className="flex h-[60px] w-14 flex-none flex-col items-center justify-center rounded-md bg-secondary leading-[1.1]"
			>
				<span className="text-[11.5px] font-bold text-muted-foreground uppercase">
					{formatSessionDate(request.sessionDate, "weekdayShort")}
				</span>
				<strong className="text-2xl">
					{Number(request.sessionDate.slice(8))}
				</strong>
			</span>
			<span className="flex min-w-0 flex-1 basis-[180px] flex-col gap-0.5">
				<span className="sr-only">
					{formatSessionDate(request.sessionDate, "long")}
				</span>
				<strong>{request.exerciseName}</strong>
				<span className="text-[13.5px] font-bold text-primary-text">
					{group.subjectName} · {groupLabel(group.number)}
				</span>
				<span className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-muted-foreground">
					<span className="inline-flex items-center gap-1.5">
						<Clock aria-hidden="true" size={15} strokeWidth={1.75} />
						{timeRange(request.startTime, request.endTime)}
					</span>
					<span className="inline-flex items-center gap-1.5">
						<MapPin aria-hidden="true" size={15} strokeWidth={1.75} />
						{request.labName}
					</span>
				</span>
			</span>
			<StatusChip request={request} withIcon />
			<ChevronRight
				aria-hidden="true"
				className="flex-none text-muted-foreground max-md:hidden"
				size={18}
			/>
		</Link>
	);
}
