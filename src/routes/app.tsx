import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getCurrentSessionFn, signOutFn } from '../server/auth-functions.ts'

export const Route = createFileRoute('/app')({
  beforeLoad: async () => {
    const user = await getCurrentSessionFn()
    if (!user) throw redirect({ to: '/sign-in' })
    return { user }
  },
  component: AppLayout,
})

function AppLayout() {
  const { user } = Route.useRouteContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!menuOpen || !isMobile) return
    sidebarRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMobile, menuOpen])

  function closeMenu() {
    setMenuOpen(false)
    if (isMobile) menuButtonRef.current?.focus()
  }

  async function signOut() {
    await signOutFn()
    window.location.assign('/')
  }

  return (
    <div className="app-frame">
      <button
        ref={menuButtonRef}
        className="app-menu-button"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span aria-hidden="true">☰</span> Menú
      </button>
      <aside
        ref={sidebarRef}
        id="app-sidebar"
        className={`app-sidebar${menuOpen ? ' is-open' : ''}`}
        aria-hidden={isMobile && !menuOpen}
        inert={isMobile && !menuOpen}
      >
        <a className="app-brand" href="/app/dashboard"><img src="/images/logowhite.svg" alt="" /> SISLAB</a>
        <p className="sidebar-caption">Espacio de trabajo</p>
        <nav aria-label="Navegación principal" className="sidebar-nav">
          <a href="/app/dashboard" onClick={closeMenu}>Inicio</a>
          {user.roles.includes('professor') && <>
            <a href="/app/groups/new" onClick={closeMenu}>Registrar grupo</a>
            <a href="/app/groups/manage" onClick={closeMenu}>Mis grupos</a>
          </>}
          {user.roles.includes('admin') && <>
            <p className="sidebar-caption">Administración</p>
            <a href="/app/admin/users" onClick={closeMenu}>Usuarios</a>
            <a href="/app/admin/accounts" onClick={closeMenu}>Solicitudes de acceso</a>
            <a href="/app/admin/groups" onClick={closeMenu}>Grupos</a>
            <a href="/app/admin/periods" onClick={closeMenu}>Periodos académicos</a>
            <a href="/app/admin/catalogs" onClick={closeMenu}>Catálogos</a>
          </>}
        </nav>
        <div className="sidebar-bottom">
          <span className="sidebar-user">{user.name} {user.surname}</span>
          <a href="/" onClick={closeMenu}>Ir al sitio público</a>
          <button className="sidebar-signout" type="button" onClick={signOut}>Cerrar sesión</button>
        </div>
      </aside>
      {menuOpen && <button aria-label="Cerrar menú" className="sidebar-backdrop" onClick={closeMenu} type="button" />}
      <div className="app-content"><Outlet /></div>
    </div>
  )
}
