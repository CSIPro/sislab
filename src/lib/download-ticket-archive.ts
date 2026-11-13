import { getDailyTicketRequestsFn } from "../server/preparation-request-functions.ts";
import { buildDailyTicket } from "./daily-ticket.ts";
import { saveFile } from "./download-report-workbook.ts";
import type { TicketArchivePlan } from "./ticket-archive.ts";

/**
 * Renders each ticket of the plan as a PDF, one at a time, and saves them in a
 * zip. `onProgress` gets the number of the ticket being made and the total.
 * Aborting `signal` stops the export before the next ticket and saves nothing,
 * and the call rejects with the signal's reason.
 *
 * The PDF renderer and the zip library load on the first call, so the report
 * page does not carry them.
 */
export async function downloadTicketArchive(
	plan: TicketArchivePlan,
	{
		signal,
		onProgress,
	}: {
		signal: AbortSignal;
		onProgress: (current: number, total: number) => void;
	},
): Promise<void> {
	const [{ pdf }, { ticketDocument }, { zipSync }] = await Promise.all([
		import("@react-pdf/renderer"),
		import("../components/pdf-ticket.tsx"),
		import("fflate"),
	]);
	const files: Record<string, Uint8Array> = {};
	for (const [index, { periodCode, date, path }] of plan.entries.entries()) {
		signal.throwIfAborted();
		onProgress(index + 1, plan.entries.length);
		// The server answers with the day's tickets for every period. This folder keeps its own.
		const rows = (await getDailyTicketRequestsFn({ data: { date } })).filter(
			({ group }) => group.periodCode === periodCode,
		);
		const exercises = buildDailyTicket(rows);
		if (exercises.length === 0) continue;
		const blob = await pdf(ticketDocument(exercises, date)).toBlob();
		files[path] = new Uint8Array(await blob.arrayBuffer());
	}
	signal.throwIfAborted();
	// PDFs are compressed already, so the zip only stores them.
	saveFile(
		new Blob([zipSync(files, { level: 0 }) as BlobPart], {
			type: "application/zip",
		}),
		plan.fileName,
	);
}
