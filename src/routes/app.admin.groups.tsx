import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { GroupCard } from "../components/group-card.tsx";
import {
	GroupEditDialog,
	type GroupInput,
} from "../components/group-edit-dialog.tsx";
import { ActionNotice, type NoticeState } from "../components/notice.tsx";
import { EmptyState, Page, PageHeader } from "../components/page.tsx";
import { Button } from "../components/ui/button.tsx";
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

type AdminGroup = Awaited<ReturnType<typeof listAllGroupsFn>>[number];

function AdminGroupsPage() {
	const { groups: initialGroups, options } = Route.useLoaderData();
	const { periodCode } = Route.useRouteContext();
	const [groups, setGroups] = useState(initialGroups);
	const [includeInactive, setIncludeInactive] = useState(true);
	const [notice, setNotice] = useState<NoticeState>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [dialogNotice, setDialogNotice] = useState<NoticeState>(null);
	const editing = groups.find(
		({ group }) => group.id === editingId && group.active,
	);

	async function showGroups(showInactive: boolean) {
		setIncludeInactive(showInactive);
		setGroups(
			await listAllGroupsFn({ data: { includeInactive: showInactive } }),
		);
	}

	async function save({ group, professor }: AdminGroup, input: GroupInput) {
		setBusyId(group.id);
		setDialogNotice(null);
		try {
			await updateAnyGroupFn({ data: { groupId: group.id, input } });
			setNotice({
				text: `Se actualizó el grupo ${group.number} de ${professor.name}.`,
				error: false,
			});
			setEditingId(null);
			await showGroups(includeInactive);
		} catch (error) {
			setDialogNotice({
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
		<Page>
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
			<div className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-5">
				{groups.map(({ group, professor }) => (
					<GroupCard
						currentPeriodCode={periodCode}
						group={group}
						key={group.id}
						professor={professor}
					>
						{group.active && (
							<Button
								onClick={() => {
									setDialogNotice(null);
									setEditingId(group.id);
								}}
								variant="outline"
							>
								Editar
							</Button>
						)}
						<Button
							disabled={busyId === group.id}
							onClick={() => void changeActivity(group.id, group.active)}
							variant={group.active ? "destructive" : "outline"}
						>
							{group.active ? "Desactivar" : "Reactivar"}
						</Button>
					</GroupCard>
				))}
			</div>

			{editing && (
				<GroupEditDialog
					busy={busyId === editing.group.id}
					group={editing.group}
					notice={dialogNotice}
					onClose={() => setEditingId(null)}
					onSave={(input) => void save(editing, input)}
					options={options}
				/>
			)}
		</Page>
	);
}
