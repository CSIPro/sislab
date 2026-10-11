import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useLocation,
} from "@tanstack/react-router";
import {
	ArrowUpRight,
	CalendarDays,
	ClipboardList,
	FlaskConical,
	LayoutDashboard,
	LogOut,
	Menu,
	Settings2,
	UsersRound,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listAcademicPeriodsFn } from "../server/academic-period-functions.ts";
import { getCurrentSessionFn, signOutFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/app")({
	beforeLoad: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		const periodOptions = await listAcademicPeriodsFn();
		return { user, periodCode: periodOptions.suggestedCode };
	},
	component: AppLayout,
});

function AppLayout() {
	const { user, periodCode } = Route.useRouteContext();
	const { pathname } = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const sidebarRef = useRef<HTMLElement>(null);
	const initials =
		`${user.name.trim().charAt(0)}${user.surname.trim().charAt(0)}`.toLocaleUpperCase();
	const pageTitle = routeTitles[pathname] ?? "Tablero";

	useEffect(() => {
		const media = window.matchMedia("(max-width: 760px)");
		const update = () => setIsMobile(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);

	useEffect(() => {
		if (!menuOpen || !isMobile) return;
		sidebarRef.current?.querySelector<HTMLElement>("a, button")?.focus();
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setMenuOpen(false);
			menuButtonRef.current?.focus();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isMobile, menuOpen]);

	function closeMenu() {
		setMenuOpen(false);
		if (isMobile) menuButtonRef.current?.focus();
	}

	async function signOut() {
		await signOutFn();
		window.location.assign("/");
	}

	const professor = user.roles.includes("professor");
	const staff = user.roles.includes("staff") || user.roles.includes("admin");
	const admin = user.roles.includes("admin");
	const roleLabel = [
		professor ? "Docente" : null,
		user.roles.includes("staff") ? "Personal de laboratorio" : null,
		admin ? "Administración" : null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<div className="app-frame">
			<aside
				ref={sidebarRef}
				id="app-sidebar"
				className={`app-sidebar${menuOpen ? " is-open" : ""}`}
				aria-hidden={isMobile && !menuOpen}
				inert={isMobile && !menuOpen}
			>
				<Link className="app-brand" to="/app/dashboard" onClick={closeMenu}>
					<img src="/images/logo.svg" alt="" />
					<span>
						<strong>SISLAB</strong>
						<small>Sistema de Laboratorios</small>
					</span>
				</Link>

				<nav aria-label="Navegación principal" className="sidebar-nav">
					<Link
						aria-current={pathname === "/app/dashboard" ? "page" : undefined}
						className="sidebar-link"
						to="/app/dashboard"
						onClick={closeMenu}
					>
						<LayoutDashboard aria-hidden="true" size={18} />
						Tablero
					</Link>

					{professor && (
						<div className="sidebar-group">
							<p className="sidebar-caption">Grupos</p>
							<Link
								aria-current={
									pathname === "/app/groups/manage" ? "page" : undefined
								}
								className="sidebar-link sidebar-link-sub"
								to="/app/groups/manage"
								onClick={closeMenu}
							>
								<UsersRound aria-hidden="true" size={17} />
								Mis grupos
							</Link>
							<Link
								aria-current={
									pathname === "/app/groups/new" ? "page" : undefined
								}
								className="sidebar-link sidebar-link-sub"
								to="/app/groups/new"
								onClick={closeMenu}
							>
								<FlaskConical aria-hidden="true" size={17} />
								Registrar grupo
							</Link>
						</div>
					)}

					{(professor || staff) && (
						<div className="sidebar-group">
							<p className="sidebar-caption">Solicitudes</p>
							{professor && (
								<Link
									aria-current={
										pathname === "/app/requests/mine" ? "page" : undefined
									}
									className="sidebar-link sidebar-link-sub"
									to="/app/requests/mine"
									onClick={closeMenu}
								>
									<ClipboardList aria-hidden="true" size={17} />
									Mis solicitudes
								</Link>
							)}
							{professor && (
								<Link
									aria-current={
										pathname === "/app/requests/new" ? "page" : undefined
									}
									className="sidebar-link sidebar-link-sub"
									to="/app/requests/new"
									onClick={closeMenu}
								>
									<FlaskConical aria-hidden="true" size={17} />
									Nueva solicitud
								</Link>
							)}
							{staff && (
								<Link
									aria-current={
										pathname === "/app/requests/all" ? "page" : undefined
									}
									className="sidebar-link sidebar-link-sub"
									to="/app/requests/all"
									onClick={closeMenu}
								>
									<ClipboardList aria-hidden="true" size={17} />
									Todas las solicitudes
								</Link>
							)}
						</div>
					)}

					{admin && (
						<div className="sidebar-group">
							<p className="sidebar-caption">Administración</p>
							<Link
								aria-current={
									pathname === "/app/admin/accounts" ? "page" : undefined
								}
								className="sidebar-link sidebar-link-sub"
								to="/app/admin/accounts"
								onClick={closeMenu}
							>
								<UsersRound aria-hidden="true" size={17} />
								Accesos pendientes
							</Link>
							<Link
								aria-current={
									pathname === "/app/admin/users" ? "page" : undefined
								}
								className="sidebar-link sidebar-link-sub"
								to="/app/admin/users"
								onClick={closeMenu}
							>
								<UsersRound aria-hidden="true" size={17} />
								Usuarios
							</Link>
							<Link
								aria-current={
									pathname === "/app/admin/groups" ? "page" : undefined
								}
								className="sidebar-link sidebar-link-sub"
								to="/app/admin/groups"
								onClick={closeMenu}
							>
								<FlaskConical aria-hidden="true" size={17} />
								Grupos
							</Link>
							<Link
								aria-current={
									pathname === "/app/admin/exercises" ? "page" : undefined
								}
								className="sidebar-link sidebar-link-sub"
								to="/app/admin/exercises"
								onClick={closeMenu}
							>
								<FlaskConical aria-hidden="true" size={17} />
								Ejercicios de laboratorio
							</Link>
							<Link
								aria-current={
									pathname === "/app/admin/periods" ? "page" : undefined
								}
								className="sidebar-link sidebar-link-sub"
								to="/app/admin/periods"
								onClick={closeMenu}
							>
								<CalendarDays aria-hidden="true" size={17} />
								Periodos académicos
							</Link>
							<Link
								aria-current={
									pathname === "/app/admin/catalogs" ? "page" : undefined
								}
								className="sidebar-link sidebar-link-sub"
								to="/app/admin/catalogs"
								onClick={closeMenu}
							>
								<Settings2 aria-hidden="true" size={17} />
								Catálogos
							</Link>
							<Link
								aria-current={
									pathname === "/app/admin/settings" ? "page" : undefined
								}
								className="sidebar-link sidebar-link-sub"
								to="/app/admin/settings"
								onClick={closeMenu}
							>
								<Settings2 aria-hidden="true" size={17} />
								Configuración
							</Link>
						</div>
					)}
				</nav>

				<div className="sidebar-bottom">
					<div className="sidebar-profile">
						<span aria-hidden="true" className="sidebar-avatar">
							{initials}
						</span>
						<span className="sidebar-profile-copy">
							<strong>
								{user.name} {user.surname}
							</strong>
							<small>{roleLabel}</small>
						</span>
					</div>
					<Link className="sidebar-footer-link" to="/" onClick={closeMenu}>
						Ir al sitio público <ArrowUpRight aria-hidden="true" size={15} />
					</Link>
					<button className="sidebar-signout" type="button" onClick={signOut}>
						<LogOut aria-hidden="true" size={17} />
						Cerrar sesión
					</button>
				</div>
			</aside>

			{menuOpen && (
				<button
					aria-label="Cerrar menú"
					className="sidebar-backdrop"
					onClick={closeMenu}
					type="button"
				/>
			)}

			<div className="app-content">
				<header className="app-header">
					<button
						ref={menuButtonRef}
						className="app-menu-button"
						type="button"
						aria-expanded={menuOpen}
						aria-controls="app-sidebar"
						aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
						onClick={() => setMenuOpen((open) => !open)}
					>
						{menuOpen ? (
							<X aria-hidden="true" size={20} />
						) : (
							<Menu aria-hidden="true" size={20} />
						)}
					</button>
					<nav aria-label="Ruta de navegación" className="app-breadcrumbs">
						<Link to="/app/dashboard">Inicio</Link>
						<span aria-hidden="true">/</span>
						<strong>{pageTitle}</strong>
					</nav>
					<div className="app-header-actions">
						{periodCode && <span className="app-period">{periodCode}</span>}
						<span
							aria-label={`${user.name} ${user.surname}`}
							className="header-avatar"
							role="img"
						>
							{initials}
						</span>
					</div>
				</header>
				<Outlet />
			</div>
		</div>
	);
}

const routeTitles: Record<string, string> = {
	"/app/dashboard": "Tablero",
	"/app/groups/new": "Registrar grupo",
	"/app/groups/manage": "Mis grupos",
	"/app/requests/mine": "Mis solicitudes",
	"/app/requests/new": "Nueva solicitud",
	"/app/requests/all": "Todas las solicitudes",
	"/app/admin/accounts": "Solicitudes de acceso",
	"/app/admin/users": "Usuarios",
	"/app/admin/groups": "Grupos",
	"/app/admin/exercises": "Ejercicios de laboratorio",
	"/app/admin/periods": "Periodos académicos",
	"/app/admin/catalogs": "Catálogos",
	"/app/admin/settings": "Configuración",
};
