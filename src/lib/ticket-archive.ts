export type TicketArchiveEntry = {
	periodCode: string;
	/** The day the ticket is for, YYYY-MM-DD. */
	date: string;
	/** Where the PDF goes in the zip: a folder named by the period, then the file. */
	path: string;
};

export type TicketArchivePlan = {
	fileName: string;
	entries: TicketArchiveEntry[];
};

/**
 * The files of a ticket archive: one folder per period with one PDF per day
 * that has printable requests. Periods keep the order given and days run oldest
 * first. A period without ticket days adds no folder, and with no days at all
 * the plan has no entries.
 */
export function planTicketArchive(
	periodCodes: string[],
	ticketDays: Record<string, string[]>,
): TicketArchivePlan {
	return {
		fileName: `sislab-tickets-${periodCodes.join("_")}.zip`,
		entries: periodCodes.flatMap((periodCode) =>
			[...(ticketDays[periodCode] ?? [])].sort().map((date) => ({
				periodCode,
				date,
				path: `${periodCode}/sislab-${date}.pdf`,
			})),
		),
	};
}
