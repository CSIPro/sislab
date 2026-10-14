import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ActiveBadge } from "../components/active-badge.tsx";
import {
	DescriptionItem,
	DescriptionList,
} from "../components/description-list.tsx";
import { GroupFields, readGroupFields } from "../components/group-fields.tsx";
import { ActionNotice, type NoticeState } from "../components/notice.tsx";
import {
	EmptyState,
	Page,
	PageHeader,
	PeriodPill,
} from "../components/page.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardFooter, CardTitle } from "../components/ui/card.tsx";
import { ScrollArea, ScrollBar } from "../components/ui/scroll-area.tsx";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "../components/ui/toggle-group.tsx";
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
	const [notice, setNotice] = useState<NoticeState>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [openId, setOpenId] = useState<string | null>(null);
	const activeGroups = groups.filter((group) => group.active);
	const visibleGroups = includeInactive ? groups : activeGroups;
	const weekGroups = [...activeGroups].sort((a, b) =>
		a.startTime.localeCompare(b.startTime),
	);
	const clock = useSislabClock();
	const todayWeekday = clock ? weekdayOf(clock.today) : null;
	const weekRef = useRef<HTMLDivElement>(null);

	// Bring today's column into view when the clock first reads, and again when
	// the date rolls over. The 30 second ticks within a day leave the scroll alone.
	// biome-ignore lint/correctness/useExhaustiveDependencies: todayWeekday is the trigger, the effect reads it through the DOM.
	useEffect(() => {
		const column = weekRef.current?.querySelector<HTMLElement>(
			"[data-today='true']",
		);
		const viewport = column?.closest<HTMLElement>(
			"[data-slot='scroll-area-viewport']",
		);
		if (!column || !viewport) return;
		const offset =
			column.getBoundingClientRect().left -
			viewport.getBoundingClientRect().left -
			(viewport.clientWidth - column.offsetWidth) / 2;
		viewport.scrollTo({
			left: viewport.scrollLeft + offset,
			behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
				? "auto"
				: "smooth",
		});
	}, [todayWeekday]);

	async function reload() {
		setGroups(await listMyGroupsFn({ data: { includeInactive: true } }));
	}

	async function save(event: FormEvent<HTMLFormElement>, group: Group) {
		event.preventDefault();
		const fields = readGroupFields(new FormData(event.currentTarget));
		setBusyId(group.id);
		setNotice(null);
		try {
			await updateMyGroupFn({
				data: {
					groupId: group.id,
					input: { ...fields, number: fields.number ?? group.number },
				},
			});
			setNotice({
				text: `Se actualizó el grupo ${group.number}.`,
				error: false,
			});
			setOpenId(null);
			await reload();
		} catch (error) {
			setNotice({
				text: userFacingError(error, "No se pudo actualizar este grupo."),
				error: true,
			});
		} finally {
			setBusyId(null);
		}
	}

	async function changeActivity(group: Group) {
		setBusyId(group.id);
		setNotice(null);
		try {
			if (group.active)
				await deactivateMyGroupFn({ data: { groupId: group.id } });
			else await reactivateMyGroupFn({ data: { groupId: group.id } });
			await reload();
		} catch (error) {
			setNotice({
				text: userFacingError(error, "No se pudo cambiar este grupo."),
				error: true,
			});
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
				<ScrollArea className="w-full">
					<div className="flex gap-3 pb-3" ref={weekRef}>
						{WEEK_DAYS.map((day) => {
							const dayGroups = weekGroups.filter(
								(group) => group.weekday === day,
							);
							return (
								<div
									className="flex w-44 shrink-0 flex-col gap-2"
									data-today={day === todayWeekday}
									key={day}
								>
									<span className="text-[13px] font-bold text-muted-foreground">
										{weekdays[day]}
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
													{timeRange(group.startTime, group.endTime)} ·{" "}
													{group.labName}
												</span>
											</div>
										);
									})}
								</div>
							);
						})}
					</div>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
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
				<ActionNotice notice={notice} />
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
						<Card
							asChild
							className={cn(!group.active && "bg-background")}
							key={group.id}
						>
							<article>
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
											{group.periodCode !== periodCode &&
												` · Período ${group.periodCode}`}
										</p>
									</div>
									<div className="flex flex-wrap items-center justify-end gap-2 text-[13px] font-bold">
										<span>{groupLabel(group.number)}</span>
										<ActiveBadge
											active={group.active}
											labels={["Activo", "Inactivo"]}
										/>
									</div>
								</header>
								<DescriptionList columns={2}>
									<DescriptionItem term="Día y hora">
										{weekdays[group.weekday]},{" "}
										{timeRange(group.startTime, group.endTime)}
									</DescriptionItem>
									<DescriptionItem term="Laboratorio">
										{group.labName}
									</DescriptionItem>
									<DescriptionItem term="Estudiantes">
										{group.students}
									</DescriptionItem>
									<DescriptionItem term="Equipos">
										{group.teams}
									</DescriptionItem>
								</DescriptionList>
								<CardFooter className="pt-4">
									{group.active && (
										<Button asChild variant="outline">
											<Link search={{ group: group.id }} to="/app/requests/new">
												Solicitar preparación
											</Link>
										</Button>
									)}
									<Button
										aria-expanded={openId === group.id}
										onClick={() =>
											setOpenId(openId === group.id ? null : group.id)
										}
										variant="outline"
									>
										{group.active ? "Editar" : "Ver detalle"}
									</Button>
								</CardFooter>
								{openId === group.id && (
									<form
										className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3.5 border-t pt-4"
										onSubmit={(event) => void save(event, group)}
									>
										<GroupFields
											group={group}
											idPrefix={`group-${group.id}`}
											options={options}
										/>
										<div className="col-span-full flex flex-wrap gap-3">
											<Button
												disabled={busyId === group.id}
												size="lg"
												type="submit"
											>
												{busyId === group.id ? "Guardando…" : "Guardar cambios"}
											</Button>
											<Button
												disabled={busyId === group.id}
												onClick={() => void changeActivity(group)}
												size="lg"
												variant={group.active ? "destructive" : "outline"}
											>
												{group.active ? "Desactivar" : "Reactivar"}
											</Button>
										</div>
									</form>
								)}
							</article>
						</Card>
					))}
				</div>
			</section>
		</Page>
	);
}
