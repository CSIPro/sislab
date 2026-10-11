export type PreparationRequestStatusFields = {
	status: string;
	lateReason: string | null;
	lateAcceptedAt: Date | null;
	lateDeclinedAt: Date | null;
};

export type PreparationRequestStatusKey =
	| "open"
	| "pending"
	| "accepted"
	| "declined"
	| "voided";

export function requestStatusKey(
	request: PreparationRequestStatusFields,
): PreparationRequestStatusKey {
	if (request.status === "voided") return "voided";
	if (request.lateReason && request.lateAcceptedAt) return "accepted";
	if (request.lateReason && request.lateDeclinedAt) return "declined";
	if (request.lateReason) return "pending";
	return "open";
}

export const requestStatusLabels: Record<PreparationRequestStatusKey, string> =
	{
		open: "Registrada",
		pending: "Excepción pendiente",
		accepted: "Excepción aceptada",
		declined: "Excepción rechazada",
		voided: "Anulada",
	};

export function requestStatusLabel(
	request: PreparationRequestStatusFields,
): string {
	return requestStatusLabels[requestStatusKey(request)];
}

export function canDecideLateException(
	request: PreparationRequestStatusFields,
): boolean {
	return requestStatusKey(request) === "pending";
}
