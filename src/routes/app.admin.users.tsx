import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { userFacingError } from "../lib/user-facing-error.ts";
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

const allRoles: UserRole[] = ["professor", "staff", "admin"];

function UserAccessPage() {
	const initial = Route.useLoaderData();
	const [users, setUsers] = useState(initial.users);
	const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole[]>>(() =>
		Object.fromEntries(initial.users.map((user) => [user.id, user.roles])),
	);
	const [passwords, setPasswords] = useState<Record<string, string>>({});
	const [message, setMessage] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);

	async function saveRoles(user: ManagedUser) {
		setBusyId(user.id);
		setMessage("");
		try {
			const updated = await setUserRolesFn({
				data: { userId: user.id, roles: roleDrafts[user.id] ?? [] },
			});
			updateUser(updated);
			setMessage(`Se guardaron los roles de ${user.name} ${user.surname}.`);
		} catch (error) {
			setMessage(errorText(error, "No se pudieron guardar los roles."));
		} finally {
			setBusyId(null);
		}
	}

	async function toggleActive(user: ManagedUser) {
		setBusyId(user.id);
		setMessage("");
		try {
			const updated = await setUserActiveFn({
				data: { userId: user.id, active: !user.active },
			});
			updateUser(updated);
			setMessage(
				`${user.name} ${user.surname}: ${updated.active ? "acceso activo" : "acceso desactivado"}.`,
			);
		} catch (error) {
			setMessage(errorText(error, "No se pudo actualizar el acceso."));
		} finally {
			setBusyId(null);
		}
	}

	async function replacePassword(user: ManagedUser) {
		const password = passwords[user.id] ?? "";
		setBusyId(user.id);
		setMessage("");
		try {
			await replaceUserPasswordFn({ data: { userId: user.id, password } });
			setPasswords((current) => ({ ...current, [user.id]: "" }));
			setMessage(
				`Se cambió la contraseña de ${user.name} ${user.surname} y se cerraron sus otras sesiones.`,
			);
		} catch (error) {
			setMessage(errorText(error, "No se pudo cambiar la contraseña."));
		} finally {
			setBusyId(null);
		}
	}

	function updateUser(updated: ManagedUser) {
		setUsers((current) =>
			current.map((user) => (user.id === updated.id ? updated : user)),
		);
		setRoleDrafts((current) => ({ ...current, [updated.id]: updated.roles }));
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-5xl rounded-2xl p-6 sm:p-8">
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--foreground)]">
					Acceso de usuarios
				</h1>
				<p className="text-[var(--muted-foreground)]">
					Administra los roles y el acceso a las cuentas. Al cambiar una contraseña se cierran las sesiones activas de esa persona.
				</p>
				<ul className="mt-6 divide-y divide-[var(--border)]">
					{users.map((user) => (
						<li className="py-5" key={user.id}>
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<p className="m-0 font-semibold">
										{user.name} {user.surname}
									</p>
									<p className="m-0 text-sm text-[var(--muted-foreground)]">
										{user.email}
									</p>
								</div>
								<button
									className="rounded-lg border border-[var(--border)] px-4 py-2 font-semibold disabled:opacity-60"
									type="button"
									disabled={busyId !== null}
									onClick={() => toggleActive(user)}
								>
									{user.active ? "Desactivar" : "Reactivar"}
								</button>
							</div>
							<fieldset
								className="mt-4 flex flex-wrap gap-4"
								disabled={busyId !== null}
							>
								<legend className="sr-only">
					Roles de {user.name} {user.surname}
								</legend>
								{allRoles.map((role) => (
									<label className="flex items-center gap-2" key={role}>
										<input
											checked={(roleDrafts[user.id] ?? []).includes(role)}
											type="checkbox"
											onChange={(event) => {
												const selected = roleDrafts[user.id] ?? [];
												setRoleDrafts((current) => ({
													...current,
													[user.id]: event.target.checked
														? [...selected, role]
														: selected.filter((entry) => entry !== role),
												}));
											}}
										/>
						{role === "professor" ? "Profesor" : role === "staff" ? "Personal de laboratorio" : "Administración"}
									</label>
								))}
								<button
									className="rounded-lg border border-[var(--border)] px-4 py-1 font-semibold disabled:opacity-60"
									type="button"
									disabled={busyId !== null}
									onClick={() => saveRoles(user)}
								>
					{busyId === user.id ? "Guardando…" : "Guardar roles"}
								</button>
							</fieldset>
							<form
								className="mt-4 flex flex-wrap gap-2"
								onSubmit={(event) => {
									event.preventDefault();
									void replacePassword(user);
								}}
							>
								<label className="sr-only" htmlFor={`password-${user.id}`}>
					Contraseña nueva para {user.name} {user.surname}
								</label>
								<input
									className="rounded-lg border border-[var(--border)] px-4 py-2"
									autoComplete="new-password"
									id={`password-${user.id}`}
									minLength={12}
									placeholder="Contraseña nueva"
									value={passwords[user.id] ?? ""}
									required
									onChange={(event) =>
										setPasswords((current) => ({
											...current,
											[user.id]: event.target.value,
										}))
									}
								/>
								<button
									className="rounded-lg border border-[var(--border)] px-4 py-2 font-semibold disabled:opacity-60"
									type="submit"
									disabled={busyId !== null}
								>
					Cambiar contraseña
								</button>
							</form>
						</li>
					))}
				</ul>
				{message && (
					<output aria-live="polite" className="mt-4 block text-sm" role="status">
						{message}
					</output>
				)}
			</section>
		</main>
	);
}

function errorText(error: unknown, fallback: string): string {
	return userFacingError(error, fallback);
}
