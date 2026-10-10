import { createFileRoute, Link } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { getCurrentSessionFn, signInFn } from '../server/auth-functions.ts'

export const Route = createFileRoute('/')({
  loader: () => getCurrentSessionFn(),
  component: LandingPage,
})

function LandingPage() {
  const user = Route.useLoaderData()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await signInFn({
        data: {
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        },
      })
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      window.location.assign('/app/dashboard')
    } catch {
      setMessage('No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <section className="landing-hero px-5 py-14 sm:px-8 sm:py-20">
        <div className="page-wrap grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <img className="mb-8 h-16 w-auto" src="/images/logo.svg" alt="SISLAB · Sistema de Laboratorios" />
            <p className="island-kicker mb-3">Sistema de Laboratorios · CSI PRO</p>
            <h1 className="mb-5 max-w-2xl text-4xl leading-tight font-bold sm:text-6xl">
              Organiza tus grupos y sus horarios de laboratorio.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
              SISLAB ayuda al profesorado a registrar los grupos y horarios de laboratorio que ya tiene asignados. Las personas administradoras gestionan el acceso y los catálogos que apoyan ese trabajo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="button-primary" href={user ? '/app/dashboard' : '#acceso'}>{user ? 'Ir a mi espacio' : 'Ingresar'}</a>
              {!user && <Link className="button-secondary" to="/sign-up">Solicitar acceso</Link>}
            </div>
            <p className="mt-8 max-w-2xl text-sm text-[var(--muted-foreground)]">
              Más adelante, SISLAB incorporará solicitudes de preparación para que el personal de laboratorio prepare reactivos y equipo. Esta función aún no está disponible.
            </p>
          </div>

          <section id="acceso" className="access-card" aria-labelledby="access-title">
            {user ? (
              <>
                <p className="island-kicker">Sesión activa</p>
                <h2 id="access-title" className="mt-2 text-2xl font-bold">Hola, {user.name}</h2>
                <p className="mt-2 text-[var(--muted-foreground)]">Ya iniciaste sesión en SISLAB.</p>
                <a className="button-primary mt-6 w-full" href="/app/dashboard">Ir a mi espacio</a>
              </>
            ) : (
              <>
                <p className="island-kicker">Tu espacio de trabajo</p>
                <h2 id="access-title" className="mt-2 text-2xl font-bold">Ingresar a SISLAB</h2>
                <form className="mt-6 grid gap-4" onSubmit={submit}>
                  <label className="field-label">Correo electrónico
                    <input className="field-control" name="email" type="email" autoComplete="username" required />
                  </label>
                  <label className="field-label">Contraseña
                    <input className="field-control" name="password" type="password" autoComplete="current-password" required />
                  </label>
                  {message && <p className="m-0 text-sm text-destructive" role="alert">{message}</p>}
                  <button className="button-primary w-full" type="submit" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
                </form>
                <p className="mt-5 text-sm text-[var(--muted-foreground)]">¿Aún no tienes cuenta? <Link className="font-bold text-primary-text underline" to="/sign-up">Solicitar acceso</Link></p>
              </>
            )}
          </section>
        </div>
      </section>

      <section id="que-es-sislab" className="page-wrap grid gap-5 px-4 py-14 md:grid-cols-3">
        <article className="content-card"><h2>Profesorado</h2><p>Registra tus grupos y consulta los horarios de laboratorio que te asignaron.</p></article>
        <article className="content-card"><h2>Administración</h2><p>Gestiona cuentas, periodos académicos y catálogos de laboratorios, carreras y materias.</p></article>
        <article className="content-card"><h2>Personal de laboratorio</h2><p>El trabajo con solicitudes de preparación se incorporará en una etapa futura.</p></article>
      </section>

      <section className="page-wrap px-4 pb-14">
        <div className="content-card">
          <p className="island-kicker">Desarrollado por CSI PRO</p>
          <h2 className="mt-2 text-2xl font-bold">Un proyecto para acompañar el trabajo de los laboratorios docentes.</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            <li><strong>Kevin Ochoa Guerrero</strong><span className="block text-sm text-[var(--muted-foreground)]">Diseñador UX/UI y Desarrollador Front-end</span></li>
            <li><strong>Saúl Eduardo Fimbres Ruíz</strong><span className="block text-sm text-[var(--muted-foreground)]">Desarrollador Full Stack</span></li>
            <li><strong>Saúl Alberto Ramos Laborín</strong><span className="block text-sm text-[var(--muted-foreground)]">Desarrollador Full Stack</span></li>
          </ul>
        </div>
      </section>
    </main>
  )
}
