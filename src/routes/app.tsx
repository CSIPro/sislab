import {
	createFileRoute,
	Link,
	type LinkProps,
	Outlet,
	redirect,
	useLocation,
} from "@tanstack/react-router";
import {
	CalendarDays,
	CirclePlus,
	ClipboardList,
	FileText,
	FlaskConical,
	House,
	LayoutDashboard,
	LogOut,
	type LucideIcon,
	Menu,
	Settings2,
	Tags,
	UserCheck,
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

type NavItem = { to: LinkProps["to"]; label: string; icon: LucideIcon };
type NavGroup = { caption: string; items: NavItem[] };

function AppLayout() {
	const { user } = Route.useRouteContext();
	const { pathname } = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const sidebarRef = useRef<HTMLElement>(null);
	const initials =
		`${user.name.trim().charAt(0)}${user.surname.trim().charAt(0)}`.toLocaleUpperCase();

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

	const groups: NavGroup[] = [];
	if (professor) {
		groups.push(
			{
				caption: "Grupos",
				items: [
					{ to: "/app/groups/manage", label: "Mis grupos", icon: UsersRound },
				],
			},
			{
				caption: "Solicitudes",
				items: [
					{
						to: "/app/requests/new",
						label: "Nueva solicitud",
						icon: CirclePlus,
					},
					{
						to: "/app/requests/mine",
						label: "Mis solicitudes",
						icon: FileText,
					},
				],
			},
		);
	}
	if (staff) {
		groups.push({
			caption: admin ? "Administración" : "Laboratorio",
			items: [
				{
					to: "/app/requests/all",
					label: "Todas las solicitudes",
					icon: ClipboardList,
				},
				...(admin ? adminItems : []),
			],
		});
	}

	return (
		<div className="app-frame">
			<aside
				ref={sidebarRef}
				id="app-sidebar"
				className={`app-sidebar${menuOpen ? " is-open" : ""}`}
				aria-hidden={isMobile && !menuOpen}
				inert={isMobile && !menuOpen}
			>
				<Link
					aria-label="SISLAB, ir a la página de inicio"
					className="app-brand"
					to="/"
					onClick={closeMenu}
				>
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
						<LayoutDashboard aria-hidden="true" size={20} strokeWidth={1.75} />
						Tablero
					</Link>
					{groups.map((group) => (
						<div key={group.caption} className="sidebar-nav">
							<p className="sidebar-caption">{group.caption}</p>
							{group.items.map(({ to, label, icon: Icon }) => (
								<Link
									aria-current={pathname === to ? "page" : undefined}
									className="sidebar-link"
									key={to}
									to={to}
									onClick={closeMenu}
								>
									<Icon aria-hidden="true" size={20} strokeWidth={1.75} />
									{label}
								</Link>
							))}
						</div>
					))}
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
					<Link
						className="sidebar-link sidebar-link-sm"
						to="/"
						onClick={closeMenu}
					>
						<House aria-hidden="true" size={20} strokeWidth={1.75} />
						Página de inicio
					</Link>
					<button className="button-secondary" type="button" onClick={signOut}>
						<LogOut aria-hidden="true" size={18} strokeWidth={1.75} />
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
				<header className="app-topbar">
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
					<strong>SISLAB</strong>
				</header>
				<Outlet />
			</div>
		</div>
	);
}

const adminItems: NavItem[] = [
	{ to: "/app/admin/accounts", label: "Cuentas", icon: UserCheck },
	{ to: "/app/admin/users", label: "Usuarios", icon: UsersRound },
	{ to: "/app/admin/groups", label: "Grupos", icon: UsersRound },
	{ to: "/app/admin/exercises", label: "Ejercicios", icon: FlaskConical },
	{ to: "/app/admin/periods", label: "Periodos", icon: CalendarDays },
	{ to: "/app/admin/catalogs", label: "Catálogos", icon: Tags },
	{ to: "/app/admin/settings", label: "Configuración", icon: Settings2 },
];
