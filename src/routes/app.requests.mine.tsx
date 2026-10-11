import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Fragment, useState } from "react";
import { OptionSelect } from "../components/option-select.tsx";
import { Footnote, Page, PageHeader } from "../components/page.tsx";
import {
	RequestDetails,
	StatusChip,
	statusFilterOptions,
} from "../components/request-parts.tsx";
import { Button } from "../components/ui/button.tsx";
import { Label } from "../components/ui/label.tsx";
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
import { requestStatusKey } from "../lib/preparation-request-status.ts";
import {
	formatSessionDate,
	groupLabel,
	timeRange,
} from "../lib/session-dates.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import { listMyPreparationRequestsFn } from "../server/preparation-request-functions.ts";

export const Route = createFileRoute("/app/requests/mine")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("professor"))
			throw redirect({ to: "/app/dashboard" });
		return listMyPreparationRequestsFn();
	},
	component: MyPreparationRequestsPage,
	errorComponent: ({ reset }) => (
		<Page size="compact">
			<PageHeader
				description="Inténtalo de nuevo. Si el problema continúa, contacta al personal de laboratorio."
				title="No se pudieron cargar tus solicitudes"
			/>
			<div>
				<Button onClick={reset} size="lg">
					Intentar de nuevo
				</Button>
			</div>
		</Page>
	),
});

function MyPreparationRequestsPage() {
	const requests = Route.useLoaderData();
	const { periodCode } = Route.useRouteContext();
	const [state, setState] = useState("all");
	const [openId, setOpenId] = useState<string | null>(null);
	const visible = requests.filter(
		({ request }) => state === "all" || requestStatusKey(request) === state,
	);

	return (
		<Page size="compact">
			<PageHeader
				description={`${periodCode ? `Período ${periodCode} · ` : ""}${visible.length} ${visible.length === 1 ? "solicitud" : "solicitudes"}`}
				title="Mis solicitudes"
			>
				<Button asChild size="lg">
					<Link to="/app/requests/new">
						<Plus aria-hidden="true" size={18} strokeWidth={2} />
						Nueva solicitud
					</Link>
				</Button>
			</PageHeader>

			<div className="flex flex-wrap items-center gap-3">
				<Label htmlFor="my-requests-status">Estado</Label>
				<OptionSelect
					id="my-requests-status"
					onValueChange={setState}
					options={statusFilterOptions}
					value={state}
				/>
			</div>

			<Table className="min-w-[820px]">
				<TableHeader>
					<TableRow>
						<TableHead>Fecha y hora</TableHead>
						<TableHead>Práctica</TableHead>
						<TableHead>Grupo</TableHead>
						<TableHead>Lab.</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{visible.map((item) => {
						const { request, group } = item;
						const open = openId === request.id;
						return (
							<Fragment key={request.id}>
								<TableRow data-muted={request.status === "voided"}>
									<TableCell>
										<strong>
											{formatSessionDate(request.sessionDate, "short")}
										</strong>
										<TableCellNote>
											{timeRange(request.startTime, request.endTime)}
										</TableCellNote>
									</TableCell>
									<TableCell>
										{request.exerciseNumber} · {request.exerciseName}
									</TableCell>
									<TableCell>
										{group.subjectName} · {groupLabel(group.number)}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										{request.labName}
									</TableCell>
									<TableCell>
										<StatusChip request={request} />
									</TableCell>
									<TableCell>
										<Button
											aria-expanded={open}
											onClick={() => setOpenId(open ? null : request.id)}
											size="sm"
											variant="outline"
										>
											Ver
										</Button>
									</TableCell>
								</TableRow>
								{open && (
									<TableRow>
										<TableCell
											className="bg-background font-sans text-sm"
											colSpan={6}
										>
											<RequestDetails item={item} />
										</TableCell>
									</TableRow>
								)}
							</Fragment>
						);
					})}
					{visible.length === 0 && (
						<TableEmpty colSpan={6}>
							No hay solicitudes para este estado.
						</TableEmpty>
					)}
				</TableBody>
			</Table>

			<Footnote>
				Las solicitudes enviadas son de solo lectura. Si una solicitud fue
				anulada, puedes crear otra para la misma fecha.
			</Footnote>
		</Page>
	);
}
