import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Notice } from "../components/notice.tsx";
import { EmptyState, Footnote, Page, PageHeader } from "../components/page.tsx";
import { RequestDetails, StatusChip } from "../components/request-parts.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardHeader, CardTitle } from "../components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../components/ui/dialog.tsx";
import { Label } from "../components/ui/label.tsx";
import { MultiCombobox } from "../components/ui/multi-combobox.tsx";
import {
	Pagination,
	PaginationNext,
	PaginationPrevious,
} from "../components/ui/pagination.tsx";
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
	academicPeriodStatus,
	compareAcademicPeriodCodes,
	currentAcademicPeriodCode,
	defaultReportPeriodCode,
} from "../lib/academic-period.ts";
import {
	type PreparationRequestStatusKey,
	requestStatusKey,
	requestStatusLabels,
} from "../lib/preparation-request-status.ts";
import {
	formatSessionDate,
	groupLabel,
	sislabToday,
	timeRange,
} from "../lib/session-dates.ts";
import { listAcademicPeriodsFn } from "../server/academic-period-functions.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import { getPreparationRequestReportFn } from "../server/preparation-request-functions.ts";
import type { RequestListRow } from "../server/preparation-requests.ts";

const PAGE_SIZE = 50;

/** The statuses shown until the admin picks others: requests that still stand. */
const defaultStatuses: PreparationRequestStatusKey[] = [
	"open",
	"pending",
	"accepted",
];
const statusKeys = Object.keys(
	requestStatusLabels,
) as PreparationRequestStatusKey[];
const statusOptions = statusKeys.map((key) => ({
	value: key,
	label: requestStatusLabels[key],
}));

type Search = {
	periods?: string[];
	status?: PreparationRequestStatusKey[];
	page?: number;
};

export const Route = createFileRoute("/app/admin/reports")({
	validateSearch: (search: Record<string, unknown>): Search => {
		const periods = listOf(search.periods).filter((code) =>
			/^\d{4}-[12V]$/.test(code),
		);
		const status = listOf(search.status).filter(
			(key): key is PreparationRequestStatusKey =>
				statusKeys.includes(key as PreparationRequestStatusKey),
		);
		const page = Number(search.page);
		return {
			...(periods.length > 0 && { periods: [...new Set(periods)] }),
			...(status.length > 0 && { status: [...new Set(status)] }),
			...(Number.isInteger(page) && page > 1 && { page }),
		};
	},
	loaderDeps: ({ search }) => ({ periods: search.periods }),
	loader: async ({ deps }) => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		const { periods } = await listAcademicPeriodsFn();
		const today = sislabToday();
		const currentCode = currentAcademicPeriodCode();
		const known = new Set(periods.map(({ code }) => code));
		const chosen = (deps.periods ?? []).filter((code) => known.has(code));
		// With nothing chosen, the report falls back to the default period.
		const fallback = defaultReportPeriodCode(periods, today, currentCode);
		const selected = (chosen.length > 0 ? chosen : fallback ? [fallback] : [])
			.slice()
			.sort(compareAcademicPeriodCodes);
		return {
			// Newest first, for the picker.
			periodOptions: [...periods].reverse().map((period) => ({
				value: period.code,
				label:
					academicPeriodStatus(period, today, currentCode) === "current"
						? `${period.code} (actual)`
						: period.code,
			})),
			selected,
			report:
				selected.length > 0
					? await getPreparationRequestReportFn({ data: { periods: selected } })
					: null,
		};
	},
	component: ReportsPage,
	errorComponent: ({ reset }) => (
		<Page size="compact">
			<PageHeader
				description="Inténtalo de nuevo. Si el problema continúa, contacta al administrador."
				title="No se pudo cargar el reporte"
			/>
			<div>
				<Button onClick={reset} size="lg">
					Intentar de nuevo
				</Button>
			</div>
		</Page>
	),
});

function listOf(value: unknown): string[] {
	const items = Array.isArray(value) ? value : [value];
	return items.filter((item): item is string => typeof item === "string");
}

function ReportsPage() {
	const { periodOptions, selected, report } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [detail, setDetail] = useState<RequestListRow | null>(null);
	const statuses = search.status ?? defaultStatuses;
	const manyPeriods = selected.length > 1;

	if (!report) {
		return (
			<Page size="compact">
				<PageHeader title="Reportes" />
				<EmptyState>
					Aún no hay períodos académicos con solicitudes. Agrégalos en Períodos.
				</EmptyState>
			</Page>
		);
	}

	const filtered = report.rows.filter((item) =>
		statuses.includes(requestStatusKey(item.request)),
	);
	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const page = Math.min(search.page ?? 1, pageCount);
	const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const { totals } = report;
	const stats: Array<[string, number]> = [
		["Solicitudes", totals.total],
		["Excepciones aceptadas", totals.acceptedLate],
		["Excepciones rechazadas", totals.declinedLate],
		["Anuladas", totals.voided],
	];

	const showPage = (next: number) =>
		navigate({
			search: (current) => ({ ...current, page: next > 1 ? next : undefined }),
		});

	return (
		<Page size="compact">
			<PageHeader
				description={`Solicitudes de preparación por período académico: ${selected.join(", ")}.`}
				title="Reportes"
			/>

			<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
				<div className="flex flex-wrap items-center gap-3">
					<Label htmlFor="report-periods">Períodos</Label>
					<MultiCombobox
						className="w-auto min-w-52"
						emptyText="Ningún período coincide."
						id="report-periods"
						onValuesChange={(periods) =>
							// With every period cleared, the report goes back to the default.
							navigate({
								search: (current) => ({
									...current,
									periods: periods.length > 0 ? periods : undefined,
									page: undefined,
								}),
							})
						}
						options={periodOptions}
						placeholder="Elige períodos"
						searchPlaceholder="Buscar período"
						values={selected}
					/>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Label htmlFor="report-status">Estado</Label>
					<MultiCombobox
						className="w-auto min-w-52"
						id="report-status"
						onValuesChange={(next) =>
							navigate({
								search: (current) => ({
									...current,
									status:
										next.length > 0 ? (next as typeof statuses) : undefined,
									page: undefined,
								}),
							})
						}
						options={statusOptions}
						placeholder="Elige estados"
						search={false}
						values={statuses}
					/>
				</div>
			</div>

			<Card aria-labelledby="report-totals-title">
				<CardHeader className="items-baseline">
					<CardTitle id="report-totals-title">Totales</CardTitle>
					<span className="text-sm text-muted-foreground">
						Cuentan todas las solicitudes de los períodos, sin importar el
						filtro de estado.
					</span>
				</CardHeader>
				<dl className="grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-3">
					{stats.map(([term, count]) => (
						<div className="rounded-md bg-accent p-3" key={term}>
							<dt className="text-sm text-muted-foreground">{term}</dt>
							<dd className="text-[28px] leading-[1.1] font-bold">{count}</dd>
						</div>
					))}
				</dl>
				<div className="flex flex-col gap-2">
					<h3 className="text-sm font-bold text-muted-foreground">
						Por laboratorio
					</h3>
					{totals.byLab.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Sin solicitudes en estos períodos.
						</p>
					) : (
						<ul className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-x-6 gap-y-1">
							{totals.byLab.map(({ labName, count }) => (
								<li className="flex justify-between gap-3" key={labName}>
									<span>{labName}</span>
									<strong>{count}</strong>
								</li>
							))}
						</ul>
					)}
				</div>
			</Card>

			{filtered.length < report.rows.length && (
				<Notice>
					Se muestran {filtered.length} de {report.rows.length} solicitudes
					según el filtro de estado.
				</Notice>
			)}

			<Table className={manyPeriods ? "min-w-[1180px]" : "min-w-[1080px]"}>
				<TableHeader>
					<TableRow>
						<TableHead>Fecha y hora</TableHead>
						{manyPeriods && <TableHead>Período</TableHead>}
						<TableHead>Práctica</TableHead>
						<TableHead>Profesor</TableHead>
						<TableHead>Grupo</TableHead>
						<TableHead>Lab.</TableHead>
						<TableHead>Estado</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{visible.map((item) => (
						<ReportRow
							item={item}
							key={item.request.id}
							onOpen={() => setDetail(item)}
							showPeriod={manyPeriods}
						/>
					))}
					{visible.length === 0 && (
						<TableEmpty colSpan={manyPeriods ? 7 : 6}>
							No hay solicitudes con este filtro.
						</TableEmpty>
					)}
				</TableBody>
			</Table>

			{filtered.length > PAGE_SIZE && (
				<Pagination>
					<PaginationPrevious
						disabled={page <= 1}
						onClick={() => showPage(page - 1)}
					/>
					<span className="text-sm text-muted-foreground">
						Página {page} de {pageCount}
					</span>
					<PaginationNext
						disabled={page >= pageCount}
						onClick={() => showPage(page + 1)}
					/>
				</Pagination>
			)}

			<Footnote>
				Cada solicitud cuenta en el período de su grupo. Por defecto no se
				muestran las anuladas ni las excepciones rechazadas.
			</Footnote>

			<Dialog
				onOpenChange={(open) => {
					if (!open) setDetail(null);
				}}
				open={detail !== null}
			>
				<DialogContent className="max-h-[90%] overflow-y-auto sm:max-w-[720px]">
					{detail && (
						<>
							<DialogHeader>
								<DialogTitle>{detail.request.exerciseName}</DialogTitle>
								<DialogDescription>
									{detail.professor.name} {detail.professor.surname} ·{" "}
									{detail.group.subjectName} · {groupLabel(detail.group.number)}{" "}
									· {formatSessionDate(detail.request.sessionDate, "full")},{" "}
									{timeRange(detail.request.startTime, detail.request.endTime)}
								</DialogDescription>
							</DialogHeader>
							<RequestDetails item={detail} />
						</>
					)}
				</DialogContent>
			</Dialog>
		</Page>
	);
}

function ReportRow({
	item,
	showPeriod,
	onOpen,
}: {
	item: RequestListRow;
	showPeriod: boolean;
	onOpen: () => void;
}) {
	const { request, group, professor } = item;
	return (
		<TableRow data-muted={request.status === "voided"} onClick={onOpen}>
			<TableCell>
				{/* The row opens the details. This button keeps them reachable from the keyboard. */}
				<Button
					className="min-h-0 w-full flex-col items-start gap-0 rounded-sm px-0 text-left font-bold text-inherit hover:bg-transparent hover:text-primary-text"
					variant="ghost"
				>
					{formatSessionDate(request.sessionDate, "short")}
					<TableCellNote>
						{timeRange(request.startTime, request.endTime)}
					</TableCellNote>
				</Button>
			</TableCell>
			{showPeriod && <TableCell>{group.periodCode}</TableCell>}
			<TableCell>{request.exerciseName}</TableCell>
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
		</TableRow>
	);
}
