import { createFileRoute, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ActiveBadge } from "../components/active-badge.tsx";
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

function UserAccessPage() {
	const initial = Route.useLoaderData();
	const [users, setUsers] = useState(initial.users);
	const [selectedId, setSelectedId] = useState(initial.users[0]?.id ?? null);
	const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole[]>>({});
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	const [password, setPassword] = useState("");
	const [notice, setNotice] = useState<NoticeState>(null);
	const [busy, setBusy] = useState(false);

	const query = searchable(search.trim());
	const visible = users.filter(
		(user) =>
			(roleFilter === "all" || user.roles.includes(roleFilter as UserRole)) &&
			searchable(`${user.name} ${user.surname} ${user.email}`).includes(query),
	);
	const selected = users.find(({ id }) => id === selectedId) ?? null;
	const draftRoles = selected
		? (roleDrafts[selected.id] ?? selected.roles)
		: [];

	function select(userId: string) {
		setSelectedId(userId);
		setPassword("");
		setNotice(null);
	}

	async function run(fallback: string, action: () => Promise<string>) {
		setBusy(true);
		setNotice(null);
		try {
			setNotice({ text: await action(), error: false });
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
		setRoleDrafts(({ [updated.id]: _saved, ...rest }) => rest);
	}

	const saveRoles = (user: ManagedUser) =>
		run("No se pudieron guardar los roles.", async () => {
			applyUpdate(
				await setUserRolesFn({ data: { userId: user.id, roles: draftRoles } }),
			);
			return `Se guardaron los roles de ${user.name} ${user.surname}.`;
		});

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

	function replacePassword(event: FormEvent, user: ManagedUser) {
		event.preventDefault();
		return run("No se pudo cambiar la contraseña.", async () => {
			await replaceUserPasswordFn({ data: { userId: user.id, password } });
			setPassword("");
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
						className="max-w-[420px] flex-[1_1_320px] gap-5"
					>
						<div className="flex items-center gap-3.5">
							<PersonAvatar accent className="size-12" person={selected} />
							<div className="flex min-w-0 flex-col">
								<CardTitle className="text-xl" id="user-detail-title">
									{selected.name} {selected.surname}
								</CardTitle>
								<span className="text-sm text-muted-foreground">
									{selected.email}
								</span>
							</div>
						</div>

						<ActionNotice notice={notice} />

						<RoleCheckboxes
							disabled={busy}
							onChange={(roles) =>
								setRoleDrafts((current) => ({
									...current,
									[selected.id]: roles,
								}))
							}
							roles={draftRoles}
						>
							<FieldDescription className="mt-1">
								Administración incluye los permisos del personal de laboratorio.
							</FieldDescription>
						</RoleCheckboxes>

						<form
							className="flex flex-col gap-2.5 border-t pt-5"
							onSubmit={(event) => void replacePassword(event, selected)}
						>
							<h3 className="text-[15px] font-bold">Contraseña</h3>
							<p className="text-sm text-muted-foreground">
								Las personas no pueden recuperarla por su cuenta. Escribe una
								nueva y compártesela. Al cambiarla se cierran sus otras
								sesiones.
							</p>
							<Field>
								<FieldLabel htmlFor="user-new-password">
									Contraseña nueva
								</FieldLabel>
								<Input
									autoComplete="new-password"
									id="user-new-password"
									minLength={12}
									onChange={(event) => setPassword(event.target.value)}
									required
									value={password}
								/>
								<FieldDescription>Al menos 12 caracteres.</FieldDescription>
							</Field>
							<div>
								<Button disabled={busy} type="submit" variant="outline">
									Restablecer contraseña
								</Button>
							</div>
						</form>

						<CardFooter>
							<Button
								disabled={busy}
								onClick={() => void saveRoles(selected)}
								size="lg"
							>
								Guardar cambios
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
		</Page>
	);
}

/** Names and emails read badly in the monospace face the other tables use. */
const personCell = "font-sans text-[14.5px]";
