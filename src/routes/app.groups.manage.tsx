import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GroupCard } from "../components/group-card.tsx";
import {
	GroupEditDialog,
	type GroupInput,
} from "../components/group-edit-dialog.tsx";
import { ActionNotice } from "../components/notice.tsx";
import {
	EmptyState,
	Page,
	PageHeader,
	PeriodPill,
} from "../components/page.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardTitle } from "../components/ui/card.tsx";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "../components/ui/toggle-group.tsx";
import { useActionFailure } from "../hooks/use-action-failure.ts";
import { useSislabClock } from "../hooks/use-sislab-clock.ts";
import {
	groupLabel,
	groupSessionProgress,
	timeRange,
	weekdayOf,
} from "../lib/session-dates.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { cn } from "../lib/utils.ts";
import { weekdays } from "../lib/weekdays.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import { getProfessorGroupOptionsFn } from "../server/group-functions.ts";
import {
	deactivateMyGroupFn,
	listMyGroupsFn,
	reactivateMyGroupFn,
	updateMyGroupFn,
} from "../server/group-management-functions.ts";

export const Route = createFileRoute("/app/groups/manage")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("professor"))
			throw redirect({ to: "/app/dashboard" });
		const [groups, options] = await Promise.all([
			listMyGroupsFn({ data: { includeInactive: true } }),
			getProfessorGroupOptionsFn(),
		]);
		return { groups, options };
	},
	component: ManageGroupsPage,
});

type Group = Awaited<ReturnType<typeof listMyGroupsFn>>[number];

// The week runs Sunday through Saturday, matching the weekday numbers.
const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];

function ManageGroupsPage() {
	const { groups: initialGroups, options } = Route.useLoaderData();
	const { periodCode } = Route.useRouteContext();
	const [groups, setGroups] = useState(initialGroups);
	const [includeInactive, setIncludeInactive] = useState(false);
	const pageFailure = useActionFailure();
	const [busyId, setBusyId] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const dialogFailure = useActionFailure();
	const activeGroups = groups.filter((group) => group.active);
	const editingGroup = groups.find(
		(group) => group.id === editingId && group.active,
	);
	const visibleGroups = includeInactive ? groups : activeGroups;
	const weekGroups = [...activeGroups].sort((a, b) =>
		a.startTime.localeCompare(b.startTime),
	);
	const clock = useSislabClock();
	const todayWeekday = clock ? weekdayOf(clock.today) : null;

	async function reload() {
		setGroups(await listMyGroupsFn({ data: { includeInactive: true } }));
	}

	async function save(group: Group, input: GroupInput) {
		setBusyId(group.id);
		pageFailure.clear();
		dialogFailure.clear();
		try {
			await updateMyGroupFn({ data: { groupId: group.id, input } });
			toast.success(`Se actualizó el grupo ${group.number}.`);
			setEditingId(null);
			await reload();
		} catch (error) {
			dialogFailure.fail(
				userFacingError(error, "No se pudo actualizar este grupo."),
			);
		} finally {
			setBusyId(null);
		}
	}

	async function changeActivity(group: Group) {
		setBusyId(group.id);
		pageFailure.clear();
		try {
			if (group.active)
				await deactivateMyGroupFn({ data: { groupId: group.id } });
			else await reactivateMyGroupFn({ data: { groupId: group.id } });
			await reload();
		} catch (error) {
			pageFailure.fail(
				userFacingError(error, "No se pudo cambiar este grupo."),
			);
		} finally {
			setBusyId(null);
		}
	}

	return (
		<Page>
			<PageHeader
				description={`${activeGroups.length} ${activeGroups.length === 1 ? "grupo activo" : "grupos activos"}`}
				title="Mis grupos"
			>
				{periodCode && <PeriodPill code={periodCode} />}
				<Button asChild size="lg">
					<Link to="/app/groups/new">
						<Plus aria-hidden="true" size={18} strokeWidth={2} />
						Nuevo grupo
					</Link>
				</Button>
			</PageHeader>

			<Card aria-labelledby="groups-week-title">
				<CardTitle id="groups-week-title">
					Tu semana en el laboratorio
				</CardTitle>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(130px,100%),1fr))] gap-3">
					{WEEK_DAYS.map((day) => {
						const dayGroups = weekGroups.filter(
							(group) => group.weekday === day,
						);
						return (
							<div className="flex flex-col gap-2" key={day}>
								<span className="text-[13px] font-bold text-muted-foreground">
									{weekdays[day]}
									{day === todayWeekday && " · hoy"}
								</span>
								{dayGroups.length === 0 && (
									<div className="flex min-h-[92px] flex-col justify-center rounded-md border border-dashed p-3 text-[13px] text-muted-foreground">
										Sin laboratorio
									</div>
								)}
								{dayGroups.map((group) => {
									const progress = clock
										? groupSessionProgress({ ...group, ...clock })
										: "upcoming";
									return (
										<div
											className={cn(
												"relative flex min-h-[92px] flex-col gap-0.5 rounded-md p-3",
												progress === "past"
													? "border bg-muted/40 text-muted-foreground"
													: "bg-accent",
											)}
											key={group.id}
										>
											{progress === "ongoing" && (
												<span
													aria-hidden="true"
													className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-primary motion-safe:animate-pulse"
												/>
											)}
											<strong className="text-[14.5px]">
												{group.subjectName}
											</strong>
											<span
												className={cn(
													"text-[13px] font-bold",
													progress !== "past" && "text-primary-text",
												)}
											>
												{groupLabel(group.number)}
											</span>
											<span className="mt-1 text-[13px] text-muted-foreground">
												{timeRange(group.startTime, group.endTime)}
											</span>
											<span className="text-[13px] text-muted-foreground">
												{group.labName}
											</span>
										</div>
									);
								})}
							</div>
						);
					})}
				</div>
			</Card>

			<section
				aria-labelledby="groups-list-title"
				className="flex flex-col gap-3.5"
			>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="text-[22px] font-bold" id="groups-list-title">
						Todos tus grupos
					</h2>
					<ToggleGroup
						aria-label="Filtrar por estado"
						onValueChange={(value) => {
							if (value) setIncludeInactive(value === "all");
						}}
						type="single"
						value={includeInactive ? "all" : "active"}
						variant="outline"
					>
						<ToggleGroupItem value="active">
							Activos · {activeGroups.length}
						</ToggleGroupItem>
						<ToggleGroupItem value="all">
							Todos · {groups.length}
						</ToggleGroupItem>
					</ToggleGroup>
				</div>
				<ActionNotice failure={pageFailure.failure} />
				{visibleGroups.length === 0 && (
					<EmptyState>
						{includeInactive
							? "No hay grupos para mostrar."
							: "No hay grupos activos para mostrar."}{" "}
						<Link to="/app/groups/new">Registra un grupo</Link>
					</EmptyState>
				)}
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-5">
					{visibleGroups.map((group) => (
						<GroupCard
							currentPeriodCode={periodCode}
							group={group}
							key={group.id}
						>
							{group.active && (
								<Button asChild variant="outline">
									<Link search={{ group: group.id }} to="/app/requests/new">
										Solicitar preparación
									</Link>
								</Button>
							)}
							{group.active && (
								<Button
									onClick={() => {
										dialogFailure.clear();
										setEditingId(group.id);
									}}
									variant="outline"
								>
									Editar
								</Button>
							)}
							<Button
								disabled={busyId === group.id}
								onClick={() => void changeActivity(group)}
								variant={group.active ? "destructive" : "outline"}
							>
								{group.active ? "Desactivar" : "Reactivar"}
							</Button>
						</GroupCard>
					))}
				</div>
			</section>

			{editingGroup && (
				<GroupEditDialog
					busy={busyId === editingGroup.id}
					group={editingGroup}
					failure={dialogFailure.failure}
					onClose={() => {
						dialogFailure.clear();
						setEditingId(null);
					}}
					onSave={(input) => void save(editingGroup, input)}
					options={options}
				/>
			)}
		</Page>
	);
}
