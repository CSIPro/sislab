import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ActionNotice, type NoticeState } from "../components/notice.tsx";
import { EmptyState, Footnote, Page, PageHeader } from "../components/page.tsx";
import { PersonAvatar } from "../components/person-avatar.tsx";
import { RoleCheckboxes } from "../components/role-checkboxes.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { Checkbox } from "../components/ui/checkbox.tsx";
import { Label } from "../components/ui/label.tsx";
import { SISLAB_TIME_ZONE } from "../lib/academic-period.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
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
	const [notice, setNotice] = useState<NoticeState>(null);
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
		<Page size="narrow">
			<PageHeader
				description="Solicitudes de acceso a SISLAB. Verifica la identidad de cada persona fuera del sistema y luego activa su cuenta con los roles que le correspondan."
				title="Cuentas"
			/>

			<ActionNotice notice={notice} />

			{pending.length === 0 ? (
				<EmptyState>No hay solicitudes de acceso pendientes.</EmptyState>
			) : (
				<div className="flex flex-col gap-3.5">
					<h2 className="text-[15px] font-bold">
						{pending.length === 1
							? "1 solicitud pendiente"
							: `${pending.length} solicitudes pendientes`}
					</h2>
					{pending.map((account) => {
						const { roles, verified } = review(account.id);
						return (
							<Card
								asChild
								className="flex-row flex-wrap items-start gap-6 *:min-w-0 *:flex-[1_1_240px]"
								key={account.id}
							>
								<article>
									<div className="flex items-start gap-3.5">
										<PersonAvatar person={account} />
										<div className="flex min-w-0 flex-col">
											<h3 className="text-[19px] font-bold">
												{account.name} {account.surname}
											</h3>
											<span className="text-[15px] text-muted-foreground">
												{account.email}
											</span>
											<span className="mt-1 text-[13.5px] text-muted-foreground">
												Solicitó acceso el {requestedOn(account.createdAt)}
											</span>
										</div>
									</div>
									<RoleCheckboxes
										onChange={(next) =>
											patchReview(account.id, { roles: next })
										}
										roles={roles}
									/>
									<div className="flex flex-col gap-3">
										<Label className="min-h-11 cursor-pointer gap-3 text-[15px] font-normal">
											<Checkbox
												checked={verified}
												onCheckedChange={(checked) =>
													patchReview(account.id, {
														verified: checked === true,
													})
												}
											/>
											Verifiqué su identidad fuera de SISLAB
										</Label>
										<div>
											<Button
												disabled={
													busyId !== null || !verified || roles.length === 0
												}
												onClick={() => activate(account)}
												size="lg"
											>
												{busyId === account.id
													? "Activando…"
													: "Activar cuenta"}
											</Button>
										</div>
									</div>
								</article>
							</Card>
						);
					})}
				</div>
			)}

			<Footnote>
				Para activar una cuenta marca la verificación de identidad y elige al
				menos un rol. La persona podrá ingresar en cuanto la actives.
			</Footnote>
		</Page>
	);
}

function requestedOn(createdAt: Date) {
	return new Intl.DateTimeFormat("es-MX", {
		timeZone: SISLAB_TIME_ZONE,
		day: "numeric",
		month: "long",
	}).format(new Date(createdAt));
}
