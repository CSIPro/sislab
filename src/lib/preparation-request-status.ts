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

export function requestStatusLabel(
	request: PreparationRequestStatusFields,
): string {
	switch (requestStatusKey(request)) {
		case "voided":
			return "Anulada";
		case "accepted":
			return "Excepción aceptada";
		case "declined":
			return "Excepción rechazada";
		case "pending":
			return "Pendiente de excepción";
		case "open":
			return "Abierta";
	}
}

export function canDecideLateException(
	request: PreparationRequestStatusFields,
): boolean {
	return requestStatusKey(request) === "pending";
}
