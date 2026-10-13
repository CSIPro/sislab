import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
	type FormEvent,
	startTransition,
	useOptimistic,
	useState,
} from "react";
import { ActiveBadge } from "../components/active-badge.tsx";
import {
	DescriptionItem,
	DescriptionList,
} from "../components/description-list.tsx";
import { FormDialog } from "../components/form-dialog.tsx";
import { ActionNotice, type NoticeState } from "../components/notice.tsx";
import { OptionSelect } from "../components/option-select.tsx";
import { EmptyState, Footnote, Page, PageHeader } from "../components/page.tsx";
import { PersonAvatar } from "../components/person-avatar.tsx";
import { RoleCheckboxes } from "../components/role-checkboxes.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardFooter, CardTitle } from "../components/ui/card.tsx";
import { Checkbox } from "../components/ui/checkbox.tsx";
import {
	Field,
	FieldDescription,
	FieldLabel,
} from "../components/ui/field.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
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
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "../components/ui/tabs.tsx";
import { SISLAB_TIME_ZONE } from "../lib/academic-period.ts";
import { searchable } from "../lib/search.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { allRoles, roleLabels } from "../lib/user-roles.ts";
import {
	activatePendingAccountFn,
	listPendingAccountsFn,
} from "../server/account-functions.ts";
import type { AccountRole, PendingAccount } from "../server/accounts.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import type { ManagedUser, UserRole } from "../server/user-access.ts";
import {
	listUsersFn,
	replaceUserPasswordFn,
	setUserActiveFn,
	setUserRolesFn,
} from "../server/user-access-functions.ts";

type Search = { tab?: "access-requests" };

export const Route = createFileRoute("/app/admin/users")({
	validateSearch: (search: Record<string, unknown>): Search =>
		search.tab === "access-requests" ? { tab: "access-requests" } : {},
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		const [users, pending] = await Promise.all([
			listUsersFn(),
			listPendingAccountsFn(),
		]);
		return { users, pending };
	},
	component: UsersPage,
});

const sectionTab =
	"h-12 flex-none gap-2.5 px-[18px] text-base text-muted-foreground after:bg-primary data-[state=active]:font-bold group-data-[orientation=horizontal]/tabs:after:-bottom-px group-data-[orientation=horizontal]/tabs:after:h-[3px] max-md:px-3";

function UsersPage() {
	// Read the loader's lists directly, so a change in one tab shows in the other after the reload.
	const { users, pending } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	// The address changes only after the layout checks the session, so the tab moves first.
	const [tab, setTab] = useOptimistic(search.tab ?? "users");

	function showTab(next: string) {
		const target: Search =
			next === "access-requests" ? { tab: "access-requests" } : {};
		startTransition(async () => {
			setTab(target.tab ?? "users");
			await navigate({ replace: true, search: target });
		});
	}

	return (
		<Page size="compact">
			<PageHeader
				description="Administra las cuentas de SISLAB y revisa quién ha pedido acceso."
				title="Usuarios"
			/>

			<Tabs className="gap-6" onValueChange={showTab} value={tab}>
				<TabsList
					aria-label="Secciones de usuarios"
					className="w-full flex-wrap justify-start gap-2 border-b p-0 max-md:gap-1"
					variant="line"
				>
					<TabsTrigger className={sectionTab} value="users">
						Usuarios{" "}
						<span className="text-[13.5px] font-normal text-muted-foreground">
							{users.length}
						</span>
					</TabsTrigger>
					<TabsTrigger className={sectionTab} value="access-requests">
						Solicitudes de acceso{" "}
						{pending.length > 0 && (
							<Badge
								className="h-[22px] min-w-[22px] justify-center rounded-full px-[7px] py-0 text-[12.5px]"
								variant="warning"
							>
								{pending.length}
								<span className="sr-only">
									{pending.length === 1 ? " pendiente" : " pendientes"}
								</span>
							</Badge>
						)}
					</TabsTrigger>
				</TabsList>
				<TabsContent value="users">
					<UserAccess users={users} />
				</TabsContent>
				<TabsContent value="access-requests">
					<AccessRequests pending={pending} />
				</TabsContent>
			</Tabs>
		</Page>
	);
}

const roleFilterOptions = [
	["all", "Todos"],
	...allRoles.map((role) => [role, roleLabels[role]] as const),
] as const;

/** The form open in the dialog for the selected account. */
type Draft =
	| { mode: "roles"; roles: UserRole[] }
	| { mode: "password"; password: string };

function UserAccess({ users }: { users: ManagedUser[] }) {
	const router = useRouter();
	const [selectedId, setSelectedId] = useState(users[0]?.id ?? null);
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
			await router.invalidate();
			setDraft(null);
			setNotice({ text, error: false });
		} catch (error) {
			setNotice({ text: userFacingError(error, fallback), error: true });
		} finally {
			setBusy(false);
		}
	}

	const toggleActive = (user: ManagedUser) =>
		run("No se pudo actualizar el acceso.", async () => {
			const updated = await setUserActiveFn({
				data: { userId: user.id, active: !user.active },
			});
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
				await setUserRolesFn({
					data: { userId: user.id, roles: draft.roles },
				});
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
		<>
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
		</>
	);
}

/** Names and emails read badly in the monospace face the other tables use. */
const personCell = "font-sans text-[14.5px]";

type Review = { roles: AccountRole[]; verified: boolean };
const newReview = (): Review => ({ roles: ["professor"], verified: false });

function AccessRequests({ pending }: { pending: PendingAccount[] }) {
	const router = useRouter();
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
			await router.invalidate();
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
		<div className="flex flex-col gap-7">
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
		</div>
	);
}

function requestedOn(createdAt: Date) {
	return new Intl.DateTimeFormat("es-MX", {
		timeZone: SISLAB_TIME_ZONE,
		day: "numeric",
		month: "long",
	}).format(new Date(createdAt));
}
