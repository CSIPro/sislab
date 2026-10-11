import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Clock, Download } from "lucide-react";
import { Fragment, lazy, Suspense, useRef, useState } from "react";
import { Notice } from "../components/notice.tsx";
import { OptionSelect } from "../components/option-select.tsx";
import { Footnote, Page, PageHeader } from "../components/page.tsx";
import {
	RequestDetails,
	StatusChip,
	statusFilterOptions,
	voidedByName,
} from "../components/request-parts.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardHeader, CardTitle } from "../components/ui/card.tsx";
import { Combobox } from "../components/ui/combobox.tsx";
import { DatePicker } from "../components/ui/date-picker.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "../components/ui/dialog.tsx";
import { Field, FieldLabel } from "../components/ui/field.tsx";
import { Label } from "../components/ui/label.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";
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
import { Textarea } from "../components/ui/textarea.tsx";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "../components/ui/toggle-group.tsx";
import { buildDailyTicket, type TicketExercise } from "../lib/daily-ticket.ts";
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
import { cn } from "../lib/utils.ts";
import { type WeekDaySummary, weekDaySummaries } from "../lib/week-summary.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	decideLateExceptionFn,
	getDailyTicketRequestsFn,
	listAllPreparationRequestsFn,
	voidPreparationRequestFn,
} from "../server/preparation-request-functions.ts";
import type { RequestListRow } from "../server/preparation-requests.ts";

type Range = "day" | "week";

// The PDF renderer only runs in the browser, and only staff who open a ticket need it.
const PDFTicket = lazy(() => import("../components/pdf-ticket.tsx"));

export const Route = createFileRoute("/app/requests/all")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("staff") && !user.roles.includes("admin"))
			throw redirect({ to: "/app/dashboard" });
		const today = sislabToday();
		const { from, through } = weekRange(today);
		return {
			today,
			requests: await listAllPreparationRequestsFn({
				data: { fromDate: from, throughDate: through },
			}),
		};
	},
	component: AllPreparationRequestsPage,
	errorComponent: ({ reset }) => (
		<Page size="compact">
			<PageHeader
				description="Inténtalo de nuevo. Si el problema continúa, contacta al administrador."
				title="No se pudieron cargar las solicitudes"
			/>
			<div>
				<Button onClick={reset} size="lg">
					Intentar de nuevo
				</Button>
			</div>
		</Page>
	),
});

function AllPreparationRequestsPage() {
	const initial = Route.useLoaderData();
	const { periodCode } = Route.useRouteContext();
	const [requests, setRequests] = useState(initial.requests);
	const [loadedWeek, setLoadedWeek] = useState(weekRange(initial.today).from);
	const [date, setDate] = useState(initial.today);
	const latestDate = useRef(date);
	const latestLoad = useRef(0);
	const [range, setRange] = useState<Range>("week");
	const [labFilter, setLabFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [message, setMessage] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [ticket, setTicket] = useState<{
		date: string;
		exercises: TicketExercise[];
	} | null>(null);
	const labs = [
		...new Set(requests.map(({ request }) => request.labName)),
	].sort((a, b) => a.localeCompare(b, "es-MX"));
	const week = weekRange(date);
	// The week is always loaded, so the strip has every day's count in day view too.
	const visible =
		range === "day"
			? requests.filter(({ request }) => request.sessionDate === date)
			: requests;
	const filtered = visible.filter(
		({ request }) =>
			(labFilter === "all" || request.labName === labFilter) &&
			(statusFilter === "all" || requestStatusKey(request) === statusFilter),
	);
	const pending = visible.filter(({ request }) =>
		canDecideLateException(request),
	).length;
	const days = weekDaySummaries(
		date,
		requests.map(({ request }) => request),
	);
	const weekTotal = days.reduce((total, day) => total + day.count, 0);
	const rangeLabel = range === "day" ? "Día" : "Semana";

	const loading = loadedWeek !== week.from;

	function show(nextDate: string, nextRange: Range) {
		latestDate.current = nextDate;
		setDate(nextDate);
		setRange(nextRange);
		setMessage("");
		if (weekRange(nextDate).from !== loadedWeek) void load(nextDate);
	}

	async function load(nextDate: string) {
		const next = weekRange(nextDate);
		const loadId = ++latestLoad.current;
		try {
			const rows = await listAllPreparationRequestsFn({
				data: { fromDate: next.from, throughDate: next.through },
			});
			// A later load has started, so this answer is for a week no longer shown.
			if (loadId !== latestLoad.current) return;
			setRequests(rows);
			setLoadedWeek(next.from);
		} catch (error) {
			if (loadId !== latestLoad.current) return;
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
			await load(latestDate.current);
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
		setMessage("");
		try {
			const rows = await getDailyTicketRequestsFn({ data: { date } });
			setTicket({ date, exercises: buildDailyTicket(rows) });
		} catch (error) {
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
		<Page size="compact">
			<PageHeader
				description={`${
					range === "day"
						? formatSessionDate(date, "full")
						: `Semana del ${formatDateSpan(week.from, week.through)}`
				}${periodCode ? ` · Período ${periodCode}` : ""}`}
				title="Todas las solicitudes"
			>
				<Button onClick={printTicket} size="lg">
					<Download aria-hidden="true" size={18} strokeWidth={2} />
					Ticket del{" "}
					{formatSessionDate(date, "weekdayDay").toLocaleLowerCase("es-MX")}{" "}
					(PDF)
				</Button>
			</PageHeader>

			{pending > 0 && (
				<Notice icon={Clock} tone="warning">
					<strong>
						{pending}{" "}
						{pending === 1
							? "excepción por decidir."
							: "excepciones por decidir."}
					</strong>{" "}
					{pending === 1
						? "Mientras no la aceptes, queda fuera del ticket del día."
						: "Mientras no las aceptes, quedan fuera del ticket del día."}
				</Notice>
			)}

			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<ToggleGroup
						aria-label="Vista"
						onValueChange={(value) => {
							if (value) show(date, value as Range);
						}}
						type="single"
						value={range}
						variant="outline"
					>
						<ToggleGroupItem value="day">Día</ToggleGroupItem>
						<ToggleGroupItem value="week">Semana</ToggleGroupItem>
					</ToggleGroup>
					<Button
						aria-label={`${rangeLabel} anterior`}
						onClick={() =>
							show(addDays(date, range === "day" ? -1 : -7), range)
						}
						size="icon"
						variant="outline"
					>
						<ChevronLeft aria-hidden="true" size={18} />
					</Button>
					<Button
						aria-label={`${rangeLabel} siguiente`}
						onClick={() => show(addDays(date, range === "day" ? 1 : 7), range)}
						size="icon"
						variant="outline"
					>
						<ChevronRight aria-hidden="true" size={18} />
					</Button>
					<DatePicker
						aria-label="Fecha"
						className="w-auto min-w-36"
						onValueChange={(value) => show(value, range)}
						value={date}
					/>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Label htmlFor="all-requests-lab">Laboratorio</Label>
					<Combobox
						className="w-auto min-w-36"
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
					<Label htmlFor="all-requests-status">Estado</Label>
					<OptionSelect
						id="all-requests-status"
						onValueChange={setStatusFilter}
						options={statusFilterOptions}
						value={statusFilter}
					/>
				</div>
			</div>

			{message && <Notice tone="error">{message}</Notice>}

			<Card aria-labelledby="all-requests-week-title">
				<CardHeader className="items-baseline">
					<CardTitle id="all-requests-week-title">
						Solicitudes de la semana
					</CardTitle>
					<span className="text-sm text-muted-foreground">
						{weekTotal} {weekTotal === 1 ? "solicitud" : "solicitudes"} en la
						semana
					</span>
				</CardHeader>
				<div
					aria-busy={loading}
					className="grid grid-cols-[repeat(auto-fit,minmax(min(130px,100%),1fr))] gap-3 aria-busy:opacity-60"
				>
					{days.map((day) => (
						<WeekDayButton
							day={day}
							key={day.date}
							onSelect={() => show(day.date, range)}
							selected={day.date === date}
							isToday={day.date === initial.today}
						/>
					))}
				</div>
			</Card>

			<Table
				aria-busy={loading}
				className="min-w-[1080px] aria-busy:opacity-60"
			>
				<TableHeader>
					<TableRow>
						<TableHead>Fecha y hora</TableHead>
						<TableHead>Práctica</TableHead>
						<TableHead>Profesor</TableHead>
						<TableHead>Grupo</TableHead>
						<TableHead>Lab.</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{filtered.map((item) => (
						<StaffRequestRow
							busy={busyId === item.request.id}
							item={item}
							key={item.request.id}
							onDecide={decide}
							onVoid={voidRequest}
						/>
					))}
					{filtered.length === 0 && (
						<TableEmpty colSpan={7}>
							No hay solicitudes en estas fechas.
						</TableEmpty>
					)}
				</TableBody>
			</Table>

			<Footnote>
				El ticket incluye las solicitudes ordinarias y las excepciones aceptadas
				del día. Las excepciones sin decisión, las rechazadas y las anuladas no
				aparecen.
			</Footnote>

			<Dialog
				onOpenChange={(open) => {
					if (!open) setTicket(null);
				}}
				open={ticket !== null}
			>
				<DialogContent className="flex items-center justify-center sm:h-[90%] sm:w-[90%] sm:max-w-[600px]">
					<DialogTitle className="sr-only">Ticket del día</DialogTitle>
					{ticket?.exercises.length === 0 && (
						<DialogDescription>
							No hay solicitudes pendientes para esta fecha
						</DialogDescription>
					)}
					{ticket && ticket.exercises.length > 0 && (
						<Suspense fallback={<Skeleton className="size-[95%]" />}>
							<PDFTicket date={ticket.date} exercises={ticket.exercises} />
						</Suspense>
					)}
				</DialogContent>
			</Dialog>
		</Page>
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
			<TableRow data-muted={voided}>
				<TableCell>
					<strong>{formatSessionDate(request.sessionDate, "short")}</strong>
					<TableCellNote>
						{timeRange(request.startTime, request.endTime)}
					</TableCellNote>
				</TableCell>
				<TableCell>
					{request.exerciseName}
					{voided ? (
						<TableCellNote className="font-sans">
							Anulada por {voidedByName(item)}
							{request.voidedAt &&
								`, ${formatSessionDate(sislabToday(new Date(request.voidedAt)), "dayMonth")}`}
							.
						</TableCellNote>
					) : (
						request.lateReason && (
							<TableCellNote className="font-sans">
								Motivo: {request.lateReason}
							</TableCellNote>
						)
					)}
				</TableCell>
				<TableCell>
					{professor.name} {professor.surname}
				</TableCell>
				<TableCell>
					{group.subjectName} · {groupLabel(group.number)}
				</TableCell>
				<TableCell className="whitespace-nowrap">{request.labName}</TableCell>
				<TableCell>
					<StatusChip request={request} />
				</TableCell>
				<TableCell>
					<div className="flex gap-2">
						{canDecideLateException(request) && (
							<>
								<Button
									disabled={busy}
									onClick={() => onDecide(request.id, "accepted")}
									size="sm"
								>
									Aceptar
								</Button>
								<Button
									disabled={busy}
									onClick={() => onDecide(request.id, "declined")}
									size="sm"
									variant="outline"
								>
									Rechazar
								</Button>
							</>
						)}
						<Button
							aria-expanded={panel === "details"}
							onClick={() => toggle("details")}
							size="sm"
							variant="outline"
						>
							Ver
						</Button>
						{!voided && (
							<Button
								aria-expanded={panel === "void"}
								disabled={busy}
								onClick={() => toggle("void")}
								size="sm"
								variant="destructive"
							>
								Anular
							</Button>
						)}
					</div>
				</TableCell>
			</TableRow>
			{panel === "details" && (
				<TableRow>
					<TableCell className="bg-background font-sans text-sm" colSpan={7}>
						<RequestDetails item={item} />
					</TableCell>
				</TableRow>
			)}
			{panel === "void" && !voided && (
				<TableRow>
					<TableCell className="bg-background font-sans text-sm" colSpan={7}>
						<form
							className="flex max-w-[600px] flex-col gap-3"
							onSubmit={(event) => {
								event.preventDefault();
								onVoid(request.id, reason);
							}}
						>
							<Field>
								<FieldLabel htmlFor={`void-reason-${request.id}`}>
									Motivo de la anulación
								</FieldLabel>
								<Textarea
									id={`void-reason-${request.id}`}
									onChange={(event) => setReason(event.target.value)}
									required
									value={reason}
								/>
							</Field>
							<div>
								<Button
									disabled={busy || !reason.trim()}
									size="sm"
									type="submit"
									variant="destructive"
								>
									Confirmar anulación
								</Button>
							</div>
						</form>
					</TableCell>
				</TableRow>
			)}
		</Fragment>
	);
}

function WeekDayButton({
	day,
	selected,
	isToday,
	onSelect,
}: {
	day: WeekDaySummary;
	selected: boolean;
	isToday: boolean;
	onSelect: () => void;
}) {
	const countLabel = day.count === 1 ? "solicitud" : "solicitudes";
	const extra =
		day.pending > 0
			? `${day.pending} por decidir`
			: day.dropped > 0
				? `${day.dropped} sin efecto`
				: "";
	return (
		<Button
			aria-label={`${formatSessionDate(day.date, "long")}${isToday ? ", hoy" : ""}: ${day.count} ${countLabel}${extra && `, ${extra}`}`}
			aria-pressed={selected}
			className={cn(
				"min-h-32 w-full justify-start gap-0.5 rounded-md p-3 text-left text-[13px] font-normal hover:border-primary aria-pressed:font-normal",
				day.count > 0
					? "border-transparent bg-accent aria-pressed:bg-accent-border/60"
					: "border-dashed bg-transparent hover:border-solid aria-pressed:border-solid aria-pressed:bg-accent/50",
			)}
			onClick={onSelect}
			variant="choice"
		>
			<span className="font-bold text-muted-foreground">
				{formatSessionDate(day.date, "weekday")}
				{isToday && " · hoy"}
			</span>
			<span className="text-muted-foreground">
				{formatSessionDate(day.date, "dayMonthShort")}
			</span>
			<span className="mt-1.5 text-[28px] leading-[1.1] font-bold">
				{day.count}
			</span>
			<span className="text-muted-foreground">{countLabel}</span>
			{extra && <span className="mt-0.5 text-xs font-bold">{extra}</span>}
		</Button>
	);
}
