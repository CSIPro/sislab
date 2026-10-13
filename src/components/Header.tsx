import { Link, useRouterState } from "@tanstack/react-router";
import { ThemeIcon } from "#/components/theme-toggle.tsx";
import { Button } from "#/components/ui/button.tsx";
import { withBase } from "#/lib/base-path.ts";
import { toggleTheme } from "#/lib/theme.ts";

const navLink =
	"px-1 py-3 text-[15px] font-medium text-foreground no-underline hover:text-primary-text";

export default function Header() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	if (pathname.startsWith("/app")) return null;

	return (
		<header className="relative z-[5] border-b bg-card">
			<div className="mx-auto w-full max-w-[1200px] px-8 max-md:px-5 flex min-h-[72px] flex-wrap items-center justify-between gap-4 max-md:py-2.5">
				<Link
					className="flex items-center gap-2.5 text-foreground no-underline hover:text-foreground"
					to="/"
				>
					<img
						alt=""
						className="size-[30px]"
						src={withBase("/images/logo.svg")}
					/>
					<strong className="text-[22px] tracking-[0.02em]">SISLAB</strong>
				</Link>
				<nav
					aria-label="Secciones de la página"
					className="flex flex-wrap items-center gap-7 max-md:gap-x-3 max-md:gap-y-1"
				>
					<a className={navLink} href={withBase("/#como-funciona")}>
						Cómo funciona
					</a>
					<a className={navLink} href={withBase("/#para-quien")}>
						Para quién
					</a>
					<a className={navLink} href={withBase("/#creditos")}>
						Créditos
					</a>
					<a className={navLink} href={withBase("/#acerca")}>
						Acerca de
					</a>
					<Button
						aria-label="Cambiar entre tema claro y oscuro"
						className="[&>svg]:size-5"
						onClick={toggleTheme}
						size="icon"
						title="Cambiar tema"
						variant="outline"
					>
						<ThemeIcon />
					</Button>
					<Button asChild variant="outline">
						<a href={withBase("/#acceso")}>Ingresar</a>
					</Button>
				</nav>
			</div>
		</header>
	);
}
