import {
	buildReportWorkbook,
	type ReportWorkbookRow,
	reportWorkbookFileName,
} from "./report-workbook.ts";

const XLSX_TYPE =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Builds the report workbook in the browser and saves it as a file. ExcelJS
 * loads on the first call, so the report page does not carry it.
 */
export async function downloadReportWorkbook(
	periodCodes: string[],
	rows: ReportWorkbookRow[],
): Promise<void> {
	// ExcelJS is a CommonJS package, so its API arrives as the default export.
	const { default: ExcelJS } = await import("exceljs");
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "SISLAB";
	for (const sheet of buildReportWorkbook(periodCodes, rows)) {
		const worksheet = workbook.addWorksheet(sheet.name, {
			views: [{ state: "frozen", ySplit: 1 }],
		});
		worksheet.addRow(sheet.header).font = { bold: true };
		worksheet.addRows(sheet.rows);
		worksheet.columns.forEach((column, index) => {
			const longest = Math.max(
				sheet.header[index]?.length ?? 0,
				...sheet.rows.map((cells) => cells[index]?.length ?? 0),
			);
			column.width = Math.min(Math.max(longest + 2, 10), 60);
		});
	}
	const buffer = await workbook.xlsx.writeBuffer();
	saveFile(
		new Blob([buffer], { type: XLSX_TYPE }),
		reportWorkbookFileName(periodCodes),
	);
}

/** Hands a blob to the browser's download. */
export function saveFile(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
