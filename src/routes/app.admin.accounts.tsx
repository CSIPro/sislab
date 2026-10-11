import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { SISLAB_TIME_ZONE } from "../lib/academic-period.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { allRoles, initials, roleLabels } from "../lib/user-roles.ts";
import {
	activatePendingAccountFn,
	listPendingAccountsFn,
} from "../server/account-functions.ts";
import type { AccountRole, PendingAccount } from "../server/accounts.ts";
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

type Review = { roles: AccountRole[]; verified: boolean };
const newReview = (): Review => ({ roles: ["professor"], verified: false });

function PendingAccountsPage() {
	const initial = Route.useLoaderData();
	const [pending, setPending] = useState(initial.pending);
	const [reviews, setReviews] = useState<Record<string, Review>>({});
	const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
		null,
	);
	const [busyId, setBusyId] = useState<string | null>(null);

	const review = (id: string) => reviews[id] ?? newReview();
	const patchReview = (id: string, patch: Partial<Review>) =>
		setReviews((current) => ({
			...current,
			[id]: { ...(current[id] ?? newReview()), ...patch },
		}));

	async function activate(account: PendingAccount) {
		setBusyId(account.id);
		setNotice(null);
		try {
			await activatePendingAccountFn({
				data: { userId: account.id, roles: review(account.id).roles },
			});
			setPending((current) => current.filter(({ id }) => id !== account.id));
			setNotice({
				text: `${account.name} ${account.surname} ya puede ingresar a SISLAB.`,
				error: false,
			});
		} catch (error) {
			setNotice({
				text: userFacingError(error, "No se pudo activar esta cuenta."),
				error: true,
			});
		} finally {
			setBusyId(null);
		}
	}

	return (
		<main className="app-page">
			<div className="app-page-inner is-narrow">
				<header className="page-head-copy">
					<h1 className="page-title">Cuentas</h1>
					<p className="page-sub">
						Solicitudes de acceso a SISLAB. Verifica la identidad de cada
						persona fuera del sistema y luego activa su cuenta con los roles que
						le correspondan.
					</p>
				</header>

				{notice && (
					<output
						aria-live="polite"
						className={`notice ${notice.error ? "notice-error" : "notice-accent"}`}
					>
						{notice.text}
					</output>
				)}

				{pending.length === 0 ? (
					<p className="empty-state">
						No hay solicitudes de acceso pendientes.
					</p>
				) : (
					<div className="stack-section">
						<h2 className="detail-title">
							{pending.length === 1
								? "1 solicitud pendiente"
								: `${pending.length} solicitudes pendientes`}
						</h2>
						{pending.map((account) => {
							const { roles, verified } = review(account.id);
							return (
								<article className="account-card" key={account.id}>
									<div className="flex items-start gap-3.5">
										<span aria-hidden="true" className="avatar">
											{initials(account)}
										</span>
										<div className="flex min-w-0 flex-col">
											<h3 className="m-0 text-[19px] font-bold">
												{account.name} {account.surname}
											</h3>
											<span className="text-[15px] text-muted-foreground [overflow-wrap:anywhere]">
												{account.email}
											</span>
											<span className="mt-1 text-[13.5px] text-muted-foreground">
												Solicitó acceso el {requestedOn(account.createdAt)}
											</span>
										</div>
									</div>
									<fieldset className="fieldset-plain">
										<legend>Roles</legend>
										{allRoles.map((role) => (
											<label className="check-row" key={role}>
												<input
													checked={roles.includes(role)}
													onChange={(event) =>
														patchReview(account.id, {
															roles: event.target.checked
																? [...roles, role]
																: roles.filter((entry) => entry !== role),
														})
													}
													type="checkbox"
												/>
												{roleLabels[role]}
											</label>
										))}
									</fieldset>
									<div className="flex flex-col gap-3">
										<label className="check-row is-top">
											<input
												checked={verified}
												onChange={(event) =>
													patchReview(account.id, {
														verified: event.target.checked,
													})
												}
												type="checkbox"
											/>
											Verifiqué su identidad fuera de SISLAB
										</label>
										<div>
											<button
												className="button-primary"
												disabled={
													busyId !== null || !verified || roles.length === 0
												}
												onClick={() => activate(account)}
												type="button"
											>
												{busyId === account.id
													? "Activando…"
													: "Activar cuenta"}
											</button>
										</div>
									</div>
								</article>
							);
						})}
					</div>
				)}

				<p className="footnote">
					Para activar una cuenta marca la verificación de identidad y elige al
					menos un rol. La persona podrá ingresar en cuanto la actives.
				</p>
			</div>
		</main>
	);
}

function requestedOn(createdAt: Date) {
	return new Intl.DateTimeFormat("es-MX", {
		timeZone: SISLAB_TIME_ZONE,
		day: "numeric",
		month: "long",
	}).format(new Date(createdAt));
}
