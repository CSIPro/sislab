import {
	type PreparationRequestStatusFields,
	requestStatusLabel,
} from "./preparation-request-status.ts";
import { groupLabel, timeRange } from "./session-dates.ts";

/** The fields of a report row that the workbook prints. `RequestListRow` fits. */
export type ReportWorkbookRow = {
	request: PreparationRequestStatusFields & {
		sessionDate: string;
		startTime: string;
		endTime: string;
		labName: string;
		exerciseName: string;
		voidReason: string | null;
	};
	group: { number: number; subjectName: string; periodCode: string };
	professor: { name: string; surname: string };
	voidedBy: { name: string; surname: string } | null;
};

/** A sheet as plain data: a name, a header row and the data rows under it. */
export type WorkbookSheet = {
	name: string;
	header: string[];
	rows: string[][];
};

const header = [
	"Fecha",
	"Hora",
	"Laboratorio",
	"Profesor",
	"Grupo",
	"Práctica",
	"Estado",
	"Detalles",
];

/**
 * One sheet per period, in the order given and named by its code. Each sheet
 * holds that period's rows, newest first. A period with no rows keeps its header.
 */
export function buildReportWorkbook(
	periodCodes: string[],
	rows: ReportWorkbookRow[],
): WorkbookSheet[] {
	return periodCodes.map((code) => ({
		name: code,
		header,
		rows: rows
			.filter(({ group }) => group.periodCode === code)
			.sort(
				(a, b) =>
					b.request.sessionDate.localeCompare(a.request.sessionDate) ||
					b.request.startTime.localeCompare(a.request.startTime),
			)
			.map(toCells),
	}));
}

/** "sislab-reporte-2026-1_2026-2.xlsx" for the periods 2026-1 and 2026-2. */
export function reportWorkbookFileName(periodCodes: string[]): string {
	return `sislab-reporte-${periodCodes.join("_")}.xlsx`;
}

function toCells({
	request,
	group,
	professor,
	voidedBy,
}: ReportWorkbookRow): string[] {
	const details: string[] = [];
	if (request.lateReason) details.push(`Excepción: ${request.lateReason}`);
	if (request.status === "voided") {
		const by = voidedBy
			? `${voidedBy.name} ${voidedBy.surname}`
			: "personal de laboratorio";
		details.push(
			`Anulada por ${by}${request.voidReason ? `: ${request.voidReason}` : ""}`,
		);
	}
	return [
		request.sessionDate,
		timeRange(request.startTime, request.endTime),
		request.labName,
		`${professor.name} ${professor.surname}`,
		`${group.subjectName} · ${groupLabel(group.number)}`,
		request.exerciseName,
		requestStatusLabel(request),
		details.join("; "),
	];
}
