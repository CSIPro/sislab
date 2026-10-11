import { CircleCheck, CircleX, Clock } from "lucide-react";
import {
	DescriptionItem,
	DescriptionList,
} from "#/components/description-list.tsx";
import { Notice } from "#/components/notice.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { SISLAB_TIME_ZONE } from "../lib/academic-period.ts";
import {
	type PreparationRequestStatusFields,
	requestStatusKey,
	requestStatusLabel,
	requestStatusLabels,
} from "../lib/preparation-request-status.ts";
import type { RequestListRow } from "../server/preparation-requests.ts";

const statusStyles = {
	open: { variant: "success", icon: CircleCheck },
	accepted: { variant: "success", icon: CircleCheck },
	pending: { variant: "warning", icon: Clock },
	declined: { variant: "destructive", icon: CircleX },
	voided: { variant: "destructive", icon: CircleX },
} as const;

export function StatusChip({
	request,
	withIcon = false,
}: {
	request: PreparationRequestStatusFields;
	withIcon?: boolean;
}) {
	const { variant, icon: Icon } = statusStyles[requestStatusKey(request)];
	return (
		<Badge variant={variant}>
			{withIcon && <Icon aria-hidden="true" size={14} strokeWidth={2} />}
			{requestStatusLabel(request)}
		</Badge>
	);
}

export const statusFilterOptions: Array<[string, string]> = [
	["all", "Todos"],
	...Object.entries(requestStatusLabels),
];

export function RequestDetails({ item }: { item: RequestListRow }) {
	const { request } = item;
	return (
		<div className="flex flex-col gap-3">
			<DescriptionList columns={2}>
				<DescriptionItem term="Enviada">
					{formatDateTime(request.createdAt)}
				</DescriptionItem>
				<DescriptionItem term="Nota para el personal">
					{request.professorNote || "Sin nota"}
				</DescriptionItem>
			</DescriptionList>
			<MaterialList materials={request.materials} />
			{request.lateReason && (
				<Notice tone="warning">
					<strong>Motivo de la excepción:</strong> {request.lateReason}
				</Notice>
			)}
			{request.status === "voided" && (
				<Notice tone="error">
					Anulada por {voidedByName(item)}
					{request.voidedAt && ` · ${formatDateTime(request.voidedAt)}`}
					{request.voidReason && `. Motivo: ${request.voidReason}`}
				</Notice>
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
		<DescriptionList columns={2}>
			{sections.map(([heading, entries]) => (
				<DescriptionItem key={heading} term={heading}>
					{entries.length ? (
						<ul className="font-mono text-[13px] font-normal tabular-nums">
							{entries.map((entry) => (
								<li key={entry}>{entry}</li>
							))}
						</ul>
					) : (
						"Ninguno"
					)}
				</DescriptionItem>
			))}
		</DescriptionList>
	);
}

export function formatDateTime(value: Date) {
	return new Intl.DateTimeFormat("es-MX", {
		timeZone: SISLAB_TIME_ZONE,
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
