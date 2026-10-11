import { createFileRoute, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { OptionSelect } from "../components/option-select.tsx";
import { TableShell } from "../components/table-shell.tsx";
import { searchable } from "../lib/search.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { allRoles, initials, roleLabels } from "../lib/user-roles.ts";
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
	const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
		null,
	);
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
		<main className="app-page">
			<div className="app-page-inner is-compact">
				<header className="page-head-copy">
					<h1 className="page-title">Usuarios</h1>
					<p className="page-sub">
						Administra los roles y el acceso de cada cuenta. Los accesos nuevos
						se activan desde Cuentas.
					</p>
				</header>

				<div className="split is-top">
					<section className="stack-section min-w-0 flex-[1.8_1_560px]">
						<div className="flex flex-wrap items-end gap-3">
							<label className="field-label flex-[1_1_260px]">
								Buscar
								<input
									className="field-outline"
									onChange={(event) => setSearch(event.target.value)}
									placeholder="Nombre o correo"
									type="search"
									value={search}
								/>
							</label>
							<div className="field-label flex-[0_1_220px]">
								<label htmlFor="users-role">Rol</label>
								<OptionSelect
									className="w-full"
									id="users-role"
									onValueChange={setRoleFilter}
									options={roleFilterOptions}
									value={roleFilter}
								/>
							</div>
						</div>

						<TableShell>
							<table className="data-table is-plain" style={{ minWidth: 640 }}>
								<thead>
									<tr>
										<th scope="col">Nombre</th>
										<th scope="col">Roles</th>
										<th scope="col">Estado</th>
									</tr>
								</thead>
								<tbody>
									{visible.map((user) => (
										<tr
											className={
												[
													user.id === selectedId && "is-selected",
													!user.active && "is-void",
												]
													.filter(Boolean)
													.join(" ") || undefined
											}
											key={user.id}
										>
											<td>
												<button
													aria-pressed={user.id === selectedId}
													className="row-button"
													onClick={() => select(user.id)}
													type="button"
												>
													<strong>
														{user.name} {user.surname}
													</strong>
													<small>{user.email}</small>
												</button>
											</td>
											<td>
												<div className="flex flex-wrap gap-1.5">
													{user.roles.map((role) => (
														<span className="role-tag" key={role}>
															{roleLabels[role]}
														</span>
													))}
												</div>
											</td>
											<td>
												<span
													className={`chip ${user.active ? "chip-ok" : "chip-off"}`}
												>
													{user.active ? "Activa" : "Inactiva"}
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
							{visible.length === 0 && (
								<p className="table-empty">
									Ninguna cuenta coincide con la búsqueda.
								</p>
							)}
						</TableShell>
					</section>

					{selected && (
						<section
							aria-labelledby="user-detail-title"
							className="panel max-w-[420px] flex-[1_1_320px]"
						>
							<div className="flex items-center gap-3.5">
								<span aria-hidden="true" className="avatar is-accent">
									{initials(selected)}
								</span>
								<div className="flex min-w-0 flex-col">
									<h2 className="m-0 text-xl font-bold" id="user-detail-title">
										{selected.name} {selected.surname}
									</h2>
									<span className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
										{selected.email}
									</span>
								</div>
							</div>

							{notice && (
								<output
									aria-live="polite"
									className={`notice ${notice.error ? "notice-error" : "notice-accent"}`}
								>
									{notice.text}
								</output>
							)}

							<fieldset className="fieldset-plain" disabled={busy}>
								<legend>Roles</legend>
								{allRoles.map((role) => (
									<label className="check-row" key={role}>
										<input
											checked={draftRoles.includes(role)}
											onChange={(event) =>
												setRoleDrafts((current) => ({
													...current,
													[selected.id]: event.target.checked
														? [...draftRoles, role]
														: draftRoles.filter((entry) => entry !== role),
												}))
											}
											type="checkbox"
										/>
										{roleLabels[role]}
									</label>
								))}
								<p className="field-hint mt-1 mb-0">
									Administración incluye los permisos del personal de
									laboratorio.
								</p>
							</fieldset>

							<form
								className="panel-section"
								onSubmit={(event) => void replacePassword(event, selected)}
							>
								<h3>Contraseña</h3>
								<p className="m-0 text-sm text-muted-foreground">
									Las personas no pueden recuperarla por su cuenta. Escribe una
									nueva y compártesela. Al cambiarla se cierran sus otras
									sesiones.
								</p>
								<label className="field-label">
									Contraseña nueva
									<input
										autoComplete="new-password"
										className="field-outline"
										minLength={12}
										onChange={(event) => setPassword(event.target.value)}
										required
										value={password}
									/>
									<span className="field-hint">Al menos 12 caracteres.</span>
								</label>
								<div>
									<button
										className="button-secondary"
										disabled={busy}
										type="submit"
									>
										Restablecer contraseña
									</button>
								</div>
							</form>

							<div className="panel-actions">
								<button
									className="button-primary"
									disabled={busy}
									onClick={() => void saveRoles(selected)}
									type="button"
								>
									Guardar cambios
								</button>
								<button
									className="button-secondary"
									disabled={busy}
									onClick={() => void toggleActive(selected)}
									type="button"
								>
									{selected.active ? "Desactivar cuenta" : "Reactivar cuenta"}
								</button>
							</div>
						</section>
					)}
				</div>
			</div>
		</main>
	);
}
