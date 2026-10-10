import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
	activatePendingAccountFn,
	listPendingAccountsFn,
} from "../../server/account-functions.ts";
import type { PendingAccount } from "../../server/accounts.ts";
import { getCurrentSessionFn } from "../../server/auth-functions.ts";

export const Route = createFileRoute("/admin/accounts")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/dashboard" });
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
			setMessage(`${account.name} ${account.surname} can now sign in.`);
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Could not activate this account.",
			);
		} finally {
			setBusyId(null);
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-3xl rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Administration</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)]">
					Pending professor accounts
				</h1>
				<p className="text-[var(--sea-ink-soft)]">
					Verify each professor’s identity out of band before activating their
					account.
				</p>
				{pending.length === 0 ? (
					<p className="mt-6">There are no accounts awaiting activation.</p>
				) : (
					<ul className="mt-6 divide-y divide-[var(--line)]">
						{pending.map((account) => (
							<li
								className="flex flex-wrap items-center justify-between gap-3 py-4"
								key={account.id}
							>
								<div>
									<p className="m-0 font-semibold">
										{account.name} {account.surname}
									</p>
									<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
										{account.email}
									</p>
								</div>
								<button
									className="rounded-full border border-[var(--line)] px-4 py-2 font-semibold disabled:opacity-60"
									type="button"
									disabled={busyId !== null}
									onClick={() => activate(account)}
								>
									{busyId === account.id ? "Activating…" : "Activate"}
								</button>
							</li>
						))}
					</ul>
				)}
				{message && <output className="mt-4 block text-sm">{message}</output>}
			</section>
		</main>
	);
}
