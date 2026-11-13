import assert from "node:assert/strict";
import { test } from "node:test";
import {
	buildReportWorkbook,
	type ReportWorkbookRow,
	reportWorkbookFileName,
} from "./report-workbook.ts";

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

const row = (
	fields: {
		periodCode?: string;
		sessionDate?: string;
		startTime?: string;
		endTime?: string;
		exerciseName?: string;
		status?: string;
		lateReason?: string | null;
		lateAcceptedAt?: Date | null;
		lateDeclinedAt?: Date | null;
		voidReason?: string | null;
		voidedBy?: { name: string; surname: string } | null;
	} = {},
): ReportWorkbookRow => ({
	request: {
		sessionDate: fields.sessionDate ?? "2026-03-09",
		startTime: fields.startTime ?? "08:00:00",
		endTime: fields.endTime ?? "10:00:00",
		labName: "Lab 1",
		exerciseName: fields.exerciseName ?? "Titulación",
		status: fields.status ?? "open",
		lateReason: fields.lateReason ?? null,
		lateAcceptedAt: fields.lateAcceptedAt ?? null,
		lateDeclinedAt: fields.lateDeclinedAt ?? null,
		voidReason: fields.voidReason ?? null,
	},
	group: {
		number: 3,
		subjectName: "Química",
		periodCode: fields.periodCode ?? "2026-1",
	},
	professor: { name: "Ana", surname: "López" },
	voidedBy: fields.voidedBy ?? null,
});

test("makes one sheet per period, named by its code, in the order given", () => {
	const sheets = buildReportWorkbook(
		["2026-V", "2026-1", "2025-2"],
		[row({ periodCode: "2026-1" }), row({ periodCode: "2025-2" })],
	);
	assert.deepEqual(
		sheets.map((sheet) => sheet.name),
		["2026-V", "2026-1", "2025-2"],
	);
});

test("a period with no requests gets a sheet with only the header", () => {
	const [sheet] = buildReportWorkbook(["2026-1"], []);
	assert.deepEqual(sheet, { name: "2026-1", header, rows: [] });
});

test("each request becomes one row with the agreed columns", () => {
	const [sheet] = buildReportWorkbook(["2026-1"], [row()]);
	assert.deepEqual(sheet?.rows, [
		[
			"2026-03-09",
			"08:00–10:00",
			"Lab 1",
			"Ana López",
			"Química · Grupo 03",
			"Titulación",
			"Registrada",
			"",
		],
	]);
});

test("rows go newest first by date and then by start time, each in its own period's sheet", () => {
	const sheets = buildReportWorkbook(
		["2026-1", "2026-2"],
		[
			row({ sessionDate: "2026-03-02", exerciseName: "A" }),
			row({
				sessionDate: "2026-03-09",
				startTime: "08:00:00",
				exerciseName: "B",
			}),
			row({
				sessionDate: "2026-03-09",
				startTime: "12:00:00",
				exerciseName: "C",
			}),
			row({ periodCode: "2026-2", exerciseName: "D" }),
		],
	);
	assert.deepEqual(
		sheets.map((sheet) => sheet.rows.map((cells) => cells[5])),
		[["C", "B", "A"], ["D"]],
	);
});

test("the status column uses the Spanish labels and the details column explains late and voided requests", () => {
	const [sheet] = buildReportWorkbook(
		["2026-1"],
		[
			row({ lateReason: "Cambio de horario", sessionDate: "2026-03-13" }),
			row({
				lateReason: "Cambio de horario",
				lateAcceptedAt: new Date(),
				sessionDate: "2026-03-12",
			}),
			row({
				lateReason: "Cambio de horario",
				lateDeclinedAt: new Date(),
				sessionDate: "2026-03-11",
			}),
			row({
				status: "voided",
				voidReason: "Duplicada",
				voidedBy: { name: "Luis", surname: "Ruiz" },
				sessionDate: "2026-03-10",
			}),
		],
	);
	assert.deepEqual(
		sheet?.rows.map((cells) => [cells[6], cells[7]]),
		[
			["Excepción pendiente", "Excepción: Cambio de horario"],
			["Excepción aceptada", "Excepción: Cambio de horario"],
			["Excepción rechazada", "Excepción: Cambio de horario"],
			["Anulada", "Anulada por Luis Ruiz: Duplicada"],
		],
	);
});

test("names the file after the periods", () => {
	assert.equal(
		reportWorkbookFileName(["2026-1", "2026-2"]),
		"sislab-reporte-2026-1_2026-2.xlsx",
	);
	assert.equal(
		reportWorkbookFileName(["2026-V"]),
		"sislab-reporte-2026-V.xlsx",
	);
});
