import { CircleCheck, CircleX, Clock } from "lucide-react";
import { SISLAB_TIME_ZONE } from "../lib/academic-period.ts";
import {
	type PreparationRequestStatusFields,
	requestStatusKey,
	requestStatusLabel,
	requestStatusLabels,
} from "../lib/preparation-request-status.ts";
import type { RequestListRow } from "../server/preparation-requests.ts";

const statusStyles = {
	open: { className: "chip-ok", icon: CircleCheck },
	accepted: { className: "chip-ok", icon: CircleCheck },
	pending: { className: "chip-wait", icon: Clock },
	declined: { className: "chip-void", icon: CircleX },
	voided: { className: "chip-void", icon: CircleX },
};

export function StatusChip({
	request,
	withIcon = false,
}: {
	request: PreparationRequestStatusFields;
	withIcon?: boolean;
}) {
	const { className, icon: Icon } = statusStyles[requestStatusKey(request)];
	return (
		<span className={`chip ${className}`}>
			{withIcon && <Icon aria-hidden="true" size={14} strokeWidth={2} />}
			{requestStatusLabel(request)}
		</span>
	);
}

export const statusFilterOptions: Array<[string, string]> = [
	["all", "Todos"],
	...Object.entries(requestStatusLabels),
];

export function RequestDetails({ item }: { item: RequestListRow }) {
	const { request } = item;
	return (
		<div className="stack">
			<dl className="kv is-two">
				<div>
					<dt>Enviada</dt>
					<dd>{formatDateTime(request.createdAt)}</dd>
				</div>
				<div>
					<dt>Nota para el personal</dt>
					<dd>{request.professorNote || "Sin nota"}</dd>
				</div>
			</dl>
			<MaterialList materials={request.materials} />
			{request.lateReason && (
				<p className="notice notice-warning">
					<span>
						<strong>Motivo de la excepción:</strong> {request.lateReason}
					</span>
				</p>
			)}
			{request.status === "voided" && (
				<p className="notice notice-error">
					<span>
						Anulada por {voidedByName(item)}
						{request.voidedAt && ` · ${formatDateTime(request.voidedAt)}`}
						{request.voidReason && `. Motivo: ${request.voidReason}`}
					</span>
				</p>
			)}
		</div>
	);
}

export function voidedByName(item: RequestListRow): string {
	return item.voidedBy
		? `${item.voidedBy.name} ${item.voidedBy.surname}`
		: "personal de laboratorio";
}

function MaterialList({
	materials,
}: {
	materials: RequestListRow["request"]["materials"];
}) {
	const quantity = (item: {
		name: string;
		totalAmount: number;
		unit: string;
	}) => `${item.name}: ${item.totalAmount} ${item.unit}`;
	const waste = (item: {
		name: string;
		container: string;
		treatment: string;
	}) => `${item.name} · ${item.container} · ${item.treatment}`;
	const sections: Array<[string, string[]]> = [
		["Reactivos", materials.reagents.map(quantity)],
		["Equipo", materials.equipment.map(quantity)],
		["Reactivos omitidos", materials.omittedReagents],
		[
			"Materiales añadidos",
			[...materials.addedReagents, ...materials.addedEquipment].map(quantity),
		],
		[
			"Residuos esperados",
			[...materials.waste, ...materials.addedWaste].map(waste),
		],
	];
	return (
		<dl className="kv is-two">
			{sections.map(([heading, entries]) => (
				<div key={heading}>
					<dt>{heading}</dt>
					{entries.length ? (
						entries.map((entry) => (
							<dd className="mono" key={`${heading}-${entry}`}>
								{entry}
							</dd>
						))
					) : (
						<dd>Ninguno</dd>
					)}
				</div>
			))}
		</dl>
	);
}

export function formatDateTime(value: Date) {
	return new Intl.DateTimeFormat("es-MX", {
		timeZone: SISLAB_TIME_ZONE,
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
