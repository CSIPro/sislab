import { createFileRoute, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ActiveBadge } from "../components/active-badge.tsx";
import {
	DescriptionItem,
	DescriptionList,
} from "../components/description-list.tsx";
import { FormDialog } from "../components/form-dialog.tsx";
import { ActionNotice, type NoticeState } from "../components/notice.tsx";
import { OptionSelect } from "../components/option-select.tsx";
import { Page, PageHeader } from "../components/page.tsx";
import { PersonAvatar } from "../components/person-avatar.tsx";
import { RoleCheckboxes } from "../components/role-checkboxes.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardFooter, CardTitle } from "../components/ui/card.tsx";
import {
	Field,
	FieldDescription,
	FieldLabel,
} from "../components/ui/field.tsx";
import { Input } from "../components/ui/input.tsx";
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
import { searchable } from "../lib/search.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { allRoles, roleLabels } from "../lib/user-roles.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import type { ManagedUser, UserRole } from "../server/user-access.ts";
import {
	listUsersFn,
	replaceUserPasswordFn,
	setUserActiveFn,
	setUserRolesFn,
} from "../server/user-access-functions.ts";

export const Route = createFileRoute("/app/admin/users")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		return { users: await listUsersFn() };
	},
	component: UserAccessPage,
});

const roleFilterOptions = [
	["all", "Todos"],
	...allRoles.map((role) => [role, roleLabels[role]] as const),
] as const;

/** The form open in the dialog for the selected account. */
type Draft =
	| { mode: "roles"; roles: UserRole[] }
	| { mode: "password"; password: string };

function UserAccessPage() {
	const initial = Route.useLoaderData();
	const [users, setUsers] = useState(initial.users);
	const [selectedId, setSelectedId] = useState(initial.users[0]?.id ?? null);
	const [draft, setDraft] = useState<Draft | null>(null);
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	const [notice, setNotice] = useState<NoticeState>(null);
	const [busy, setBusy] = useState(false);

	const query = searchable(search.trim());
	const visible = users.filter(
		(user) =>
			(roleFilter === "all" || user.roles.includes(roleFilter as UserRole)) &&
			searchable(`${user.name} ${user.surname} ${user.email}`).includes(query),
	);
	const selected = users.find(({ id }) => id === selectedId) ?? null;

	function open(next: Draft | null) {
		setDraft(next);
		setNotice(null);
	}

	function select(userId: string) {
		setSelectedId(userId);
		setNotice(null);
	}

	async function run(fallback: string, action: () => Promise<string>) {
		setBusy(true);
		setNotice(null);
		try {
			const text = await action();
			setDraft(null);
			setNotice({ text, error: false });
		} catch (error) {
			setNotice({ text: userFacingError(error, fallback), error: true });
		} finally {
			setBusy(false);
		}
	}

	function applyUpdate(updated: ManagedUser) {
		setUsers((current) =>
			current.map((user) => (user.id === updated.id ? updated : user)),
		);
	}

	const toggleActive = (user: ManagedUser) =>
		run("No se pudo actualizar el acceso.", async () => {
			const updated = await setUserActiveFn({
				data: { userId: user.id, active: !user.active },
			});
			applyUpdate(updated);
			return updated.active
				? `${user.name} ${user.surname} ya puede ingresar de nuevo.`
				: `Se desactivó la cuenta de ${user.name} ${user.surname}.`;
		});

	function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!draft || !selected) return;
		const user = selected;
		if (draft.mode === "roles") {
			return run("No se pudieron guardar los roles.", async () => {
				applyUpdate(
					await setUserRolesFn({
						data: { userId: user.id, roles: draft.roles },
					}),
				);
				return `Se guardaron los roles de ${user.name} ${user.surname}.`;
			});
		}
		return run("No se pudo cambiar la contraseña.", async () => {
			await replaceUserPasswordFn({
				data: { userId: user.id, password: draft.password },
			});
			return `Se cambió la contraseña de ${user.name} ${user.surname} y se cerraron sus otras sesiones.`;
		});
	}

	return (
		<Page size="compact">
			<PageHeader
				description="Administra los roles y el acceso de cada cuenta. Los accesos nuevos se activan desde Cuentas."
				title="Usuarios"
			/>

			<div className="flex flex-wrap items-start gap-6">
				<section className="flex min-w-0 flex-[1.8_1_560px] flex-col gap-4">
					<div className="flex flex-wrap items-end gap-3">
						<Field className="flex-[1_1_260px]">
							<FieldLabel htmlFor="users-search">Buscar</FieldLabel>
							<Input
								id="users-search"
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Nombre o correo"
								type="search"
								value={search}
							/>
						</Field>
						<Field className="flex-[0_1_220px]">
							<FieldLabel htmlFor="users-role">Rol</FieldLabel>
							<OptionSelect
								className="w-full"
								id="users-role"
								onValueChange={setRoleFilter}
								options={roleFilterOptions}
								value={roleFilter}
							/>
						</Field>
					</div>

					<Table className="min-w-[640px]">
						<TableHeader>
							<TableRow>
								<TableHead>Nombre</TableHead>
								<TableHead>Roles</TableHead>
								<TableHead>Estado</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{visible.map((user) => (
								<TableRow
									data-muted={!user.active}
									data-state={user.id === selectedId ? "selected" : undefined}
									key={user.id}
								>
									<TableCell className={personCell}>
										<Button
											aria-pressed={user.id === selectedId}
											className="min-h-0 w-full flex-col items-start gap-0 rounded-sm px-0 text-left text-[14.5px] font-normal whitespace-normal text-inherit hover:bg-transparent hover:text-primary-text"
											onClick={() => select(user.id)}
											variant="ghost"
										>
											<strong>
												{user.name} {user.surname}
											</strong>
											<TableCellNote>{user.email}</TableCellNote>
										</Button>
									</TableCell>
									<TableCell className={personCell}>
										<div className="flex flex-wrap gap-1.5">
											{user.roles.map((role) => (
												<Badge key={role} variant="outline">
													{roleLabels[role]}
												</Badge>
											))}
										</div>
									</TableCell>
									<TableCell className={personCell}>
										<ActiveBadge active={user.active} />
									</TableCell>
								</TableRow>
							))}
							{visible.length === 0 && (
								<TableEmpty colSpan={3}>
									Ninguna cuenta coincide con la búsqueda.
								</TableEmpty>
							)}
						</TableBody>
					</Table>
				</section>

				{selected && (
					<Card
						aria-labelledby="user-detail-title"
						className="max-w-[420px] flex-[1_1_320px]"
					>
						{!draft && <ActionNotice notice={notice} />}
						<div className="flex items-center gap-3.5">
							<PersonAvatar accent className="size-12" person={selected} />
							<div className="flex min-w-0 flex-1 flex-col">
								<CardTitle className="text-xl" id="user-detail-title">
									{selected.name} {selected.surname}
								</CardTitle>
								<span className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
									{selected.email}
								</span>
							</div>
							<ActiveBadge active={selected.active} />
						</div>

						<DescriptionList>
							<DescriptionItem term="Roles">
								<span className="mt-1 flex flex-wrap gap-1.5">
									{selected.roles.map((role) => (
										<Badge key={role} variant="outline">
											{roleLabels[role]}
										</Badge>
									))}
								</span>
							</DescriptionItem>
						</DescriptionList>

						<CardFooter>
							<Button
								disabled={busy}
								onClick={() => open({ mode: "roles", roles: selected.roles })}
								size="lg"
							>
								Editar roles
							</Button>
							<Button
								disabled={busy}
								onClick={() => open({ mode: "password", password: "" })}
								size="lg"
								variant="outline"
							>
								Restablecer contraseña
							</Button>
							<Button
								disabled={busy}
								onClick={() => void toggleActive(selected)}
								size="lg"
								variant="outline"
							>
								{selected.active ? "Desactivar cuenta" : "Reactivar cuenta"}
							</Button>
						</CardFooter>
					</Card>
				)}
			</div>

			{draft && selected && (
				<FormDialog
					busy={busy}
					description={
						draft.mode === "roles"
							? `${selected.name} ${selected.surname}`
							: `${selected.name} ${selected.surname} no puede recuperarla por su cuenta. Escribe una nueva y compártesela. Al cambiarla se cierran sus otras sesiones.`
					}
					notice={notice}
					onClose={() => open(null)}
					onSubmit={save}
					submitLabel={
						draft.mode === "roles" ? "Guardar roles" : "Restablecer contraseña"
					}
					title={
						draft.mode === "roles" ? "Editar roles" : "Restablecer contraseña"
					}
				>
					{draft.mode === "roles" ? (
						<RoleCheckboxes
							disabled={busy}
							onChange={(roles) => setDraft({ mode: "roles", roles })}
							roles={draft.roles}
						>
							<FieldDescription className="mt-1">
								Administración incluye los permisos del personal de laboratorio.
							</FieldDescription>
						</RoleCheckboxes>
					) : (
						<Field>
							<FieldLabel htmlFor="user-new-password">
								Contraseña nueva
							</FieldLabel>
							<Input
								autoComplete="new-password"
								id="user-new-password"
								minLength={12}
								onChange={(event) =>
									setDraft({ mode: "password", password: event.target.value })
								}
								required
								value={draft.password}
							/>
							<FieldDescription>Al menos 12 caracteres.</FieldDescription>
						</Field>
					)}
				</FormDialog>
			)}
		</Page>
	);
}

/** Names and emails read badly in the monospace face the other tables use. */
const personCell = "font-sans text-[14.5px]";
