import { useRouterState } from '@tanstack/react-router'

export default function Footer() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname.startsWith('/app')) return null
  return (
    <footer className="site-footer">
      <div className="page-wrap flex flex-col items-center justify-between gap-3 px-4 py-7 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">© {new Date().getFullYear()} SISLAB · Sistema de Laboratorios</p>
        <p className="m-0 text-sm">Desarrollado por <strong className="text-[#6c2f86]">CSI PRO</strong></p>
      </div>
    </footer>
  )
}
