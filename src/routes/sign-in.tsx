import { createFileRoute, redirect } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { getCurrentSessionFn, signInFn } from '../server/auth-functions.ts'

export const Route = createFileRoute('/sign-in')({
  beforeLoad: async () => {
    if (await getCurrentSessionFn()) throw redirect({ to: '/app/dashboard' })
  },
  component: SignInPage,
})

function SignInPage() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await signInFn({ data: { email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') } })
      if (!result.ok) { setMessage(result.message); return }
      window.location.assign('/app/dashboard')
    } catch {
      setMessage('No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.')
    } finally { setBusy(false) }
  }

  return (
    <main className="auth-page">
      <section className="access-card mx-auto max-w-lg" aria-labelledby="signin-title">
        <a href="/" aria-label="SISLAB, inicio"><img className="mx-auto mb-7 h-14 w-auto" src="/images/logo.svg" alt="SISLAB · Sistema de Laboratorios" /></a>
        <p className="island-kicker">Tu espacio de trabajo</p>
        <h1 id="signin-title" className="mt-2 text-3xl font-bold">Ingresar a SISLAB</h1>
        <form className="mt-6 grid gap-4" method="post" onSubmit={submit}>
          <label className="field-label">Correo electrónico<input className="field-control" name="email" type="email" autoComplete="username" required /></label>
          <label className="field-label">Contraseña<input className="field-control" name="password" type="password" autoComplete="current-password" required /></label>
          {message && <p className="m-0 text-sm text-destructive" role="alert">{message}</p>}
          <button className="button-primary button-sm w-full" type="submit" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        </form>
        <p className="mt-5 text-sm text-[var(--muted-foreground)]">¿No tienes acceso? <a className="font-bold text-primary-text underline" href="/sign-up">Solicitar acceso</a></p>
      </section>
    </main>
  )
}
