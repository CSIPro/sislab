import type { ReactNode } from "react";
import { ActiveBadge } from "#/components/active-badge.tsx";
import {
	DescriptionItem,
	DescriptionList,
} from "#/components/description-list.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Card, CardFooter, CardTitle } from "#/components/ui/card.tsx";
import type { AcademicPeriodStatus } from "#/lib/academic-period.ts";
import { groupLabel, timeRange } from "#/lib/session-dates.ts";
import { cn } from "#/lib/utils.ts";
import { weekdays } from "#/lib/weekdays.ts";

export type GroupCardData = {
	id: string;
	periodCode: string;
	number: number;
	subjectName: string;
	careerName: string;
	labName: string;
	students: number;
	teams: number;
	weekday: number;
	startTime: string;
	endTime: string;
	active: boolean;
};

/**
 * One group: its subject, career, number, state and schedule. The page passes the
 * footer actions as `children`. Pass `professor` on pages that list several
 * professors' groups, and `currentPeriodCode` to name the period of an older group.
 * A page that already names its period passes `showPeriod={false}`.
 * `periodStatus` adds a "Concluido" or "Próximo" badge under "Activo". A current
 * period, or none, shows no badge.
 */
export function GroupCard({
	group,
	periodStatus,
	currentPeriodCode,
	showPeriod = true,
	professor,
	children,
}: {
	group: GroupCardData;
	periodStatus?: AcademicPeriodStatus;
	currentPeriodCode?: string | null;
	showPeriod?: boolean;
	professor?: { name: string; surname: string; email: string };
	children?: ReactNode;
}) {
	return (
		<Card className={cn(!group.active && "bg-background")} render={<article />}>
			<header className="flex items-start justify-between gap-3">
				<div>
					<CardTitle
						as="h3"
						className={cn(
							"text-[21px]",
							group.active ? "text-primary-text" : "text-off-text",
						)}
					>
						{group.subjectName}
					</CardTitle>
					<p className="mt-0.5 text-sm text-muted-foreground">
						{group.careerName}
						{showPeriod &&
							group.periodCode !== currentPeriodCode &&
							` · Período ${group.periodCode}`}
					</p>
					{professor && (
						<p className="mt-0.5 text-sm text-muted-foreground">
							{professor.name} {professor.surname} · {professor.email}
						</p>
					)}
				</div>
				<div className="flex flex-col items-end gap-2 text-[13px] font-bold">
					<div className="flex flex-wrap items-center justify-end gap-2">
						<span>{groupLabel(group.number)}</span>
						<ActiveBadge
							active={group.active}
							labels={["Activo", "Inactivo"]}
						/>
					</div>
					{periodStatus === "concluded" && (
						<Badge variant="neutral">Concluido</Badge>
					)}
					{periodStatus === "upcoming" && <Badge variant="info">Próximo</Badge>}
				</div>
			</header>
			<DescriptionList columns={2}>
				<DescriptionItem term="Día y hora">
					{weekdays[group.weekday]}, {timeRange(group.startTime, group.endTime)}
				</DescriptionItem>
				<DescriptionItem term="Laboratorio">{group.labName}</DescriptionItem>
				<DescriptionItem term="Estudiantes">{group.students}</DescriptionItem>
				<DescriptionItem term="Equipos">{group.teams}</DescriptionItem>
			</DescriptionList>
			{children && <CardFooter className="pt-4">{children}</CardFooter>}
		</Card>
	);
}
