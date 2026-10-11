import { createFileRoute, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ActiveBadge } from "../components/active-badge.tsx";
import { GroupFields, readGroupFields } from "../components/group-fields.tsx";
import { ActionNotice, type NoticeState } from "../components/notice.tsx";
import { EmptyState, Page, PageHeader } from "../components/page.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardTitle } from "../components/ui/card.tsx";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "../components/ui/toggle-group.tsx";
import { userFacingError } from "../lib/user-facing-error.ts";
import {
	deactivateAnyGroupFn,
	getAdminGroupOptionsFn,
	listAllGroupsFn,
	reactivateAnyGroupFn,
	updateAnyGroupFn,
} from "../server/admin-group-functions.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/app/admin/groups")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		const [groups, options] = await Promise.all([
			listAllGroupsFn({ data: { includeInactive: true } }),
			getAdminGroupOptionsFn(),
		]);
		return { groups, options };
	},
	component: AdminGroupsPage,
});

function AdminGroupsPage() {
	const { groups: initialGroups, options } = Route.useLoaderData();
	const [groups, setGroups] = useState(initialGroups);
	const [includeInactive, setIncludeInactive] = useState(true);
	const [notice, setNotice] = useState<NoticeState>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	async function showGroups(showInactive: boolean) {
		setIncludeInactive(showInactive);
		setGroups(
			await listAllGroupsFn({ data: { includeInactive: showInactive } }),
		);
	}

	async function save(event: FormEvent<HTMLFormElement>, groupId: string) {
		event.preventDefault();
		const fields = readGroupFields(new FormData(event.currentTarget));
		const current = groups.find(({ group }) => group.id === groupId);
		if (!current) return;
		setBusyId(groupId);
		setNotice(null);
		try {
			await updateAnyGroupFn({
				data: {
					groupId,
					input: { ...fields, number: fields.number ?? current.group.number },
				},
			});
			setNotice({
				text: `Se actualizó el grupo ${current.group.number} de ${current.professor.name}.`,
				error: false,
			});
			await showGroups(includeInactive);
		} catch (error) {
			setNotice({
				text: userFacingError(error, "No se pudo actualizar este grupo."),
				error: true,
			});
		} finally {
			setBusyId(null);
		}
	}

	async function changeActivity(groupId: string, active: boolean) {
		setBusyId(groupId);
		setNotice(null);
		try {
			if (active) await deactivateAnyGroupFn({ data: { groupId } });
			else await reactivateAnyGroupFn({ data: { groupId } });
			await showGroups(includeInactive);
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
		<Page size="narrow">
			<PageHeader
				description="Consulta y corrige los datos de los grupos de todo el profesorado. Cada persona sigue como responsable de sus grupos."
				title="Grupos del profesorado"
			/>

			<ToggleGroup
				aria-label="Filtrar grupos"
				onValueChange={(value) => {
					if (value) void showGroups(value === "all");
				}}
				type="single"
				value={includeInactive ? "all" : "active"}
				variant="outline"
			>
				<ToggleGroupItem value="active">Grupos activos</ToggleGroupItem>
				<ToggleGroupItem value="all">Incluir grupos inactivos</ToggleGroupItem>
			</ToggleGroup>

			<ActionNotice notice={notice} />

			{groups.length === 0 && (
				<EmptyState>No hay grupos para mostrar.</EmptyState>
			)}
			<div className="flex flex-col gap-5">
				{groups.map(({ group, professor }) => (
					<Card asChild key={group.id}>
						<article>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<CardTitle className="text-xl">
										{group.periodCode} · Grupo {group.number}
									</CardTitle>
									<p className="text-sm text-muted-foreground">
										{professor.name} {professor.surname} · {professor.email}
									</p>
								</div>
								<div className="flex items-center gap-3">
									<ActiveBadge
										active={group.active}
										labels={["Activo", "Inactivo"]}
									/>
									<Button
										disabled={busyId === group.id}
										onClick={() => void changeActivity(group.id, group.active)}
										variant={group.active ? "destructive" : "outline"}
									>
										{group.active ? "Desactivar" : "Reactivar"}
									</Button>
								</div>
							</div>
							<form
								className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3.5"
								onSubmit={(event) => void save(event, group.id)}
							>
								<GroupFields
									group={group}
									idPrefix={`group-${group.id}`}
									options={options}
								/>
								<div className="col-span-full">
									<Button
										disabled={busyId === group.id}
										size="lg"
										type="submit"
									>
										{busyId === group.id ? "Guardando…" : "Guardar cambios"}
									</Button>
								</div>
							</form>
						</article>
					</Card>
				))}
			</div>
		</Page>
	);
}
