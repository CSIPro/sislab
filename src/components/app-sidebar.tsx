import { Link, type LinkProps, useLocation } from "@tanstack/react-router";
import {
	CalendarDays,
	CirclePlus,
	CircleUserRound,
	ClipboardList,
	FileText,
	FlaskConical,
	House,
	Layers,
	LayoutDashboard,
	LogOut,
	type LucideIcon,
	Menu,
	Settings2,
	UserCheck,
	UsersRound,
	X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { PersonAvatar } from "#/components/person-avatar.tsx";
import { ThemeIcon, ThemeLabel } from "#/components/theme-toggle.tsx";
import { Button } from "#/components/ui/button.tsx";
import { ScrollArea } from "#/components/ui/scroll-area.tsx";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "#/components/ui/sidebar.tsx";
import { withBase } from "#/lib/base-path.ts";
import { toggleTheme } from "#/lib/theme.ts";
import type { AuthUser } from "#/server/auth.server.ts";

type NavItem = { to: LinkProps["to"]; label: string; icon: LucideIcon };
type NavGroup = { caption: string | null; items: NavItem[] };

const adminItems: NavItem[] = [
	{ to: "/app/admin/accounts", label: "Cuentas", icon: UserCheck },
	{ to: "/app/admin/users", label: "Usuarios", icon: CircleUserRound },
	{ to: "/app/admin/exercises", label: "Prácticas", icon: FlaskConical },
	{ to: "/app/admin/periods", label: "Períodos", icon: CalendarDays },
	{ to: "/app/admin/catalogs", label: "Catálogos", icon: Layers },
	{ to: "/app/admin/settings", label: "Configuración", icon: Settings2 },
];

function navGroups(roles: AuthUser["roles"]): NavGroup[] {
	const admin = roles.includes("admin");
	const groups: NavGroup[] = [
		{
			caption: null,
			items: [
				{ to: "/app/dashboard", label: "Tablero", icon: LayoutDashboard },
			],
		},
	];
	if (roles.includes("professor")) {
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
	if (admin || roles.includes("staff")) {
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
	return groups;
}

const menuButton =
	"h-11 gap-3 rounded-lg px-3 text-[15.5px] font-medium text-sidebar-foreground hover:bg-muted hover:text-sidebar-foreground active:bg-muted data-[active=true]:bg-accent data-[active=true]:font-bold [&>svg]:size-5 [&>svg]:text-muted-foreground data-[active=true]:[&>svg]:text-primary-text";

export function AppSidebar({
	user,
	onSignOut,
}: {
	user: AuthUser;
	onSignOut: () => void;
}) {
	const { pathname } = useLocation();
	const { setOpenMobile } = useSidebar();
	const closeMobile = () => setOpenMobile(false);
	const roleLabel = [
		user.roles.includes("professor") ? "Docente" : null,
		user.roles.includes("staff") ? "Personal de laboratorio" : null,
		user.roles.includes("admin") ? "Administración" : null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<Sidebar>
			<SidebarHeader className="px-4 pt-5 pb-0">
				<Link
					aria-label="SISLAB, ir a la página de inicio"
					className="flex items-center gap-2.5 border-b px-3 pb-4 text-sidebar-foreground no-underline hover:text-sidebar-foreground"
					onClick={closeMobile}
					to="/"
				>
					<img alt="" className="size-8" src={withBase("/images/logo.svg")} />
					<span className="grid min-w-0">
						<strong className="text-[21px] leading-[1.1] tracking-[0.02em]">
							SISLAB
						</strong>
						<small className="mt-[3px] text-xs text-muted-foreground">
							Sistema de Laboratorios
						</small>
					</span>
				</Link>
			</SidebarHeader>

			<SidebarContent className="overflow-hidden">
				<ScrollArea className="min-h-0 flex-1">
					<nav aria-label="Navegación principal" className="px-2 pt-2 pb-3">
						{navGroups(user.roles).map((group) => (
							<SidebarGroup className="py-0" key={group.caption ?? "main"}>
								{group.caption && (
									<SidebarGroupLabel className="mt-4 mb-1 h-auto px-3 text-[12.5px] font-bold text-muted-foreground">
										{group.caption}
									</SidebarGroupLabel>
								)}
								<SidebarGroupContent>
									<SidebarMenu className="gap-0.5">
										{group.items.map(({ to, label, icon: Icon }) => {
											// A page under this one, such as a single catalog, keeps it marked.
											const isCurrent = pathname === to;
											const isActive =
												isCurrent || pathname.startsWith(`${to}/`);
											return (
												<SidebarMenuItem key={to}>
													<SidebarMenuButton
														asChild
														className={menuButton}
														isActive={isActive}
													>
														<Link
															// Without an exact match the Link calls itself the current page on sub-paths.
															activeOptions={{ exact: true }}
															aria-current={
																isCurrent ? "page" : isActive || undefined
															}
															onClick={closeMobile}
															to={to}
														>
															<Icon aria-hidden="true" strokeWidth={1.75} />
															<span>{label}</span>
														</Link>
													</SidebarMenuButton>
												</SidebarMenuItem>
											);
										})}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						))}
					</nav>
				</ScrollArea>
			</SidebarContent>

			<SidebarFooter className="gap-2 px-4 pt-0 pb-4">
				<div className="flex items-center gap-3 border-t px-2 pt-3 pb-1">
					<PersonAvatar accent className="size-10" person={user} />
					<span className="grid min-w-0 leading-tight">
						<strong className="truncate text-[14.5px]">
							{user.name} {user.surname}
						</strong>
						<small className="text-[12.5px] text-muted-foreground">
							{roleLabel}
						</small>
					</span>
				</div>
				<SidebarMenu className="gap-2">
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className={`${menuButton} text-[14.5px]`}
						>
							<Link onClick={closeMobile} to="/">
								<House aria-hidden="true" strokeWidth={1.75} />
								<span>Página de inicio</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton
							className={`${menuButton} text-[14.5px]`}
							onClick={toggleTheme}
						>
							<ThemeIcon />
							<ThemeLabel />
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
				<Button onClick={onSignOut} variant="outline">
					<LogOut aria-hidden="true" size={18} strokeWidth={1.75} />
					Cerrar sesión
				</Button>
			</SidebarFooter>
		</Sidebar>
	);
}

/** The bar with the menu button. Only phones show it, where the sidebar is a drawer. */
export function MobileTopBar() {
	const { openMobile, toggleSidebar } = useSidebar();
	const trigger = useRef<HTMLButtonElement>(null);
	const wasOpen = useRef(false);
	// The drawer has no trigger of its own to hand focus back to, so do it here when it closes.
	useEffect(() => {
		if (wasOpen.current && !openMobile) trigger.current?.focus();
		wasOpen.current = openMobile;
	}, [openMobile]);
	return (
		<header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card px-4 md:hidden">
			<Button
				aria-expanded={openMobile}
				aria-label={openMobile ? "Cerrar menú" : "Abrir menú"}
				data-slot="sidebar-trigger"
				onClick={toggleSidebar}
				ref={trigger}
				size="icon"
				variant="outline"
			>
				{openMobile ? (
					<X aria-hidden="true" size={20} />
				) : (
					<Menu aria-hidden="true" size={20} />
				)}
			</Button>
			<strong className="text-lg tracking-[0.02em]">SISLAB</strong>
		</header>
	);
}
