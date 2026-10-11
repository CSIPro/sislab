import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { userFacingError } from "../lib/user-facing-error.ts";
import {
	activatePendingAccountFn,
	listPendingAccountsFn,
} from "../server/account-functions.ts";
import type { PendingAccount } from "../server/accounts.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/app/admin/accounts")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		return { pending: await listPendingAccountsFn() };
	},
	component: PendingAccountsPage,
});

function PendingAccountsPage() {
	const initial = Route.useLoaderData();
	const [pending, setPending] = useState(initial.pending);
	const [message, setMessage] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);

	async function activate(account: PendingAccount) {
		setBusyId(account.id);
		setMessage("");
		try {
			await activatePendingAccountFn({ data: { userId: account.id } });
			setPending((current) => current.filter(({ id }) => id !== account.id));
			setMessage(`${account.name} ${account.surname} ya puede ingresar a SISLAB.`);
		} catch (error) {
			setMessage(userFacingError(error, "No se pudo activar esta cuenta."));
		} finally {
			setBusyId(null);
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-3xl rounded-2xl p-6 sm:p-8">
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--foreground)]">
					Solicitudes de acceso pendientes
				</h1>
				<p className="text-[var(--muted-foreground)]">
					Verifica la identidad de cada profesor antes de activar su cuenta.
				</p>
				{pending.length === 0 ? (
					<p className="mt-6">No hay cuentas pendientes de activación.</p>
				) : (
					<ul className="mt-6 divide-y divide-[var(--border)]">
						{pending.map((account) => (
							<li
								className="flex flex-wrap items-center justify-between gap-3 py-4"
								key={account.id}
							>
								<div>
									<p className="m-0 font-semibold">
										{account.name} {account.surname}
									</p>
									<p className="m-0 text-sm text-[var(--muted-foreground)]">
										{account.email}
									</p>
								</div>
								<button
									className="rounded-lg border border-[var(--border)] px-4 py-2 font-semibold disabled:opacity-60"
									type="button"
									disabled={busyId !== null}
									onClick={() => activate(account)}
								>
									{busyId === account.id ? "Activando…" : "Activar"}
								</button>
							</li>
						))}
					</ul>
				)}
				{message && <output aria-live="polite" className="mt-4 block text-sm" role="status">{message}</output>}
			</section>
		</main>
	);
}
