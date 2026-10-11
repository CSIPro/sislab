import { Link, useRouterState } from "@tanstack/react-router";

export default function Header() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	if (pathname.startsWith("/app")) return null;

	return (
		<header className="site-header">
			<div className="site-wrap site-header-inner">
				<Link className="site-brand" to="/">
					<img src="/images/logo.svg" alt="" />
					<strong>SISLAB</strong>
				</Link>
				<nav aria-label="Secciones de la página" className="site-nav">
					<a className="site-nav-link" href="/#como-funciona">
						Cómo funciona
					</a>
					<a className="site-nav-link" href="/#para-quien">
						Para quién
					</a>
					<a className="site-nav-link" href="/#acerca">
						Acerca de
					</a>
					<a className="button-secondary" href="/#acceso">
						Ingresar
					</a>
				</nav>
			</div>
		</header>
	);
}
