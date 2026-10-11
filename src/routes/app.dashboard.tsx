import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, Plus } from "lucide-react";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import { listPendingAccountsFn } from "../server/account-functions.ts";
import { listAllGroupsFn } from "../server/admin-group-functions.ts";
import { listMyGroupsFn } from "../server/group-management-functions.ts";
import { listUsersFn } from "../server/user-access-functions.ts";
import { weekdays } from "../lib/weekdays.ts";

export const Route = createFileRoute("/app/dashboard")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });

		const [groups, adminData] = await Promise.all([
			user.roles.includes("professor")
				? listMyGroupsFn({ data: { includeInactive: false } })
				: Promise.resolve([]),
			user.roles.includes("admin")
				? Promise.all([
						listUsersFn(),
						listAllGroupsFn({ data: { includeInactive: false } }),
						listPendingAccountsFn(),
					]).then(([users, groups, pendingAccounts]) => ({
						users,
						groups,
						pendingAccounts,
					}))
				: Promise.resolve(null),
		]);

		return {
			user,
			groups,
			adminData,
		};
	},
	component: DashboardPage,
});

function DashboardPage() {
	const { user, groups, adminData } = Route.useLoaderData();
	const isProfessor = user.roles.includes("professor");
	const isAdmin = user.roles.includes("admin");
	const isStaffOnly = user.roles.includes("staff") && !isProfessor && !isAdmin;
	const activeStudents = groups.reduce((total, group) => total + group.students, 0);
	const assignedLabs = new Set(groups.map((group) => group.labName)).size;

	const stats = isAdmin && adminData
		? [
				{
					id: "users",
					label: "Cuentas activas",
					value: adminData.users.filter((entry) => entry.active).length,
					note: "Con acceso a SISLAB",
				},
				{
					id: "groups",
					label: isProfessor ? "Mis grupos activos" : "Grupos activos",
					value: isProfessor ? groups.length : adminData.groups.length,
					note: isProfessor ? "En tus grupos" : "Registrados en el sistema",
				},
				{
					id: "pending",
					label: "Accesos por revisar",
					value: adminData.pendingAccounts.length,
					note: "Solicitudes de acceso",
				},
			]
		: isProfessor
			? [
					{
						id: "groups",
						label: "Grupos activos",
						value: groups.length,
						note: "En tus periodos académicos",
					},
					{
						id: "students",
						label: "Estudiantes",
						value: activeStudents,
						note: "En tus grupos activos",
					},
					{
						id: "labs",
						label: "Laboratorios asignados",
						value: assignedLabs,
						note: "Con grupos activos",
					},
				]
			: [];

	const introduction = isProfessor && isAdmin
		? "Tu actividad docente y la administración del laboratorio."
		: isProfessor
			? "Consulta tus grupos y los horarios de laboratorio que tienes asignados."
			: isAdmin
				? "Administra el acceso y la operación académica de SISLAB."
				: "Las herramientas para preparar solicitudes estarán disponibles próximamente.";

	return (
		<main className="dashboard-page">
			<header className="dashboard-intro">
				<div>
					<h1>Buen día, {user.name}</h1>
					<p>{introduction}</p>
				</div>
				{isProfessor && (
					<Link className="button-primary dashboard-primary-action" to="/app/groups/new">
						<Plus aria-hidden="true" size={18} strokeWidth={2} />
						Registrar grupo
					</Link>
				)}
			</header>

			{stats.length > 0 && (
				<section aria-label="Resumen de actividad" className="dashboard-stats">
					{stats.map((stat) => (
						<article className="dashboard-stat-card" data-testid={`dashboard-stat-${stat.id}`} key={stat.id}>
							<p>{stat.label}</p>
							<strong>{stat.value}</strong>
							<span>{stat.note}</span>
						</article>
					))}
				</section>
			)}

			{isProfessor && (
				<section className={`dashboard-work-grid${isAdmin ? " dashboard-work-grid-admin" : ""}`}>
					<GroupsPanel groups={groups} />
					<QuickLinksPanel isAdmin={isAdmin} />
				</section>
			)}

			{isAdmin && adminData && (
				<section className={`dashboard-admin-grid${isProfessor ? " dashboard-admin-grid-mixed" : ""}`}>
					<PendingAccessPanel accounts={adminData.pendingAccounts} />
					<AdminLinksPanel />
				</section>
			)}

			{isStaffOnly && (
				<section className="dashboard-staff-panel">
					<div className="dashboard-staff-icon"><FlaskConical aria-hidden="true" size={22} /></div>
					<div>
					<h2>Preparaciones para laboratorio</h2>
					<p>Las solicitudes de preparación y los tickets diarios todavía no están disponibles. Aquí aparecerán cuando estén listos.</p>
				</div>
			</section>
			)}
		</main>
	);
}

function GroupsPanel({
	groups,
}: {
	groups: Awaited<ReturnType<typeof listMyGroupsFn>>;
}) {
	return (
		<section aria-labelledby="dashboard-groups-title" className="dashboard-panel dashboard-groups-panel">
			<div className="dashboard-panel-heading">
				<div>
					<h2 id="dashboard-groups-title">Mis grupos</h2>
					<p>Grupos activos y sus horarios asignados.</p>
				</div>
				<Link className="dashboard-text-link" to="/app/groups/manage">Ver todos <ArrowRight aria-hidden="true" size={16} /></Link>
			</div>
			{groups.length === 0 ? (
				<div className="dashboard-empty-state">
					<p>Aún no tienes grupos activos.</p>
					<Link to="/app/groups/new">Registrar tu primer grupo</Link>
				</div>
			) : (
				<ul className="dashboard-group-list">
					{groups.map((group) => (
						<li className="dashboard-group-row" key={group.id}>
							<div className="dashboard-group-number"><strong>{group.number}</strong><span>Grupo</span></div>
							<div className="dashboard-group-copy">
								<strong>{group.subjectName}</strong>
								<span>{group.careerName} · Periodo {group.periodCode}</span>
								<span>{weekdays[group.weekday]} · {group.startTime.slice(0, 5)}–{group.endTime.slice(0, 5)} · {group.labName}</span>
							</div>
							<span className="dashboard-period-badge">Activo</span>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function QuickLinksPanel({ isAdmin }: { isAdmin: boolean }) {
	return (
		<section aria-labelledby="dashboard-shortcuts-title" className="dashboard-panel dashboard-shortcuts-panel">
			<div className="dashboard-panel-heading">
				<div>
					<h2 id="dashboard-shortcuts-title">Accesos rápidos</h2>
					<p>Continúa con una tarea disponible.</p>
				</div>
			</div>
			<div className="dashboard-shortcut-list">
				<Link to="/app/groups/new">Registrar grupo <ArrowRight aria-hidden="true" size={16} /></Link>
				<Link to="/app/groups/manage">Consultar mis grupos <ArrowRight aria-hidden="true" size={16} /></Link>
				{isAdmin && <Link to="/app/admin/periods">Administrar periodos <ArrowRight aria-hidden="true" size={16} /></Link>}
			</div>
		</section>
	);
}

function PendingAccessPanel({
	accounts,
}: {
	accounts: Awaited<ReturnType<typeof listPendingAccountsFn>>;
}) {
	return (
		<section aria-labelledby="dashboard-access-title" className="dashboard-panel dashboard-access-panel">
			<div className="dashboard-panel-heading">
				<div>
					<h2 id="dashboard-access-title">Solicitudes de acceso</h2>
					<p>{accounts.length === 0 ? "No hay cuentas pendientes de revisión." : "Cuentas que esperan activación."}</p>
				</div>
				<Link className="dashboard-text-link" to="/app/admin/accounts">Ver todas <ArrowRight aria-hidden="true" size={16} /></Link>
			</div>
			{accounts.length > 0 ? (
				<ul className="dashboard-access-list">
					{accounts.slice(0, 4).map((account) => (
						<li key={account.id}>
							<span><strong>{account.name} {account.surname}</strong><small>{account.email}</small></span>
							<span className="dashboard-pending-badge">Pendiente</span>
						</li>
					))}
				</ul>
			) : (
				<div className="dashboard-empty-state">
					<p>Las nuevas solicitudes aparecerán aquí.</p>
				</div>
			)}
		</section>
	);
}

function AdminLinksPanel() {
	return (
		<section aria-labelledby="dashboard-admin-links-title" className="dashboard-panel dashboard-admin-links-panel">
			<div className="dashboard-panel-heading">
				<div>
					<h2 id="dashboard-admin-links-title">Administración</h2>
					<p>Accede a las herramientas del sistema.</p>
				</div>
			</div>
			<div className="dashboard-shortcut-list">
				<Link to="/app/admin/users">Usuarios <ArrowRight aria-hidden="true" size={16} /></Link>
				<Link to="/app/admin/groups">Grupos <ArrowRight aria-hidden="true" size={16} /></Link>
				<Link to="/app/admin/exercises">Ejercicios de laboratorio <ArrowRight aria-hidden="true" size={16} /></Link>
				<Link to="/app/admin/periods">Periodos académicos <ArrowRight aria-hidden="true" size={16} /></Link>
				<Link to="/app/admin/catalogs">Catálogos <ArrowRight aria-hidden="true" size={16} /></Link>
			</div>
		</section>
	);
}
