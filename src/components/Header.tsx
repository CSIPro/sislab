import { Link, useRouterState } from '@tanstack/react-router'

export default function Header() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname.startsWith('/app')) return null

  return (
    <header className="site-header">
      <nav className="page-wrap flex items-center justify-between gap-4 px-4 py-3" aria-label="Navegación del sitio">
        <Link to="/" className="inline-flex items-center gap-3 font-bold no-underline text-foreground">
          <img className="h-9 w-auto" src="/images/logo.svg" alt="" />
          <span>SISLAB</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <a className="text-sm font-semibold text-primary-text" href="#que-es-sislab">Conoce SISLAB</a>
          <Link className="button-primary !min-h-10 !px-4 !py-2 !text-sm" to="/sign-in">Ingresar</Link>
        </div>
      </nav>
    </header>
  )
}
