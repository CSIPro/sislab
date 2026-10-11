import { createFileRoute, Link } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { getCurrentSessionFn } from '../server/auth-functions.ts'
import { signUpFn } from '../server/account-functions.ts'
import { userFacingError } from '../lib/user-facing-error.ts'

export const Route = createFileRoute('/sign-up')({
  loader: () => getCurrentSessionFn(),
  component: SignUpPage,
})

function SignUpPage() {
  const user = Route.useLoaderData()
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      await signUpFn({ data: { email: String(form.get('email') ?? ''), name: String(form.get('name') ?? ''), surname: String(form.get('surname') ?? ''), password: String(form.get('password') ?? '') } })
      setSubmitted(true)
      setMessage('Recibimos tu solicitud. Una persona administradora debe verificar tu identidad y activar tu cuenta antes de que puedas ingresar.')
    } catch (error) {
      setMessage(userFacingError(error, 'No se pudo enviar tu solicitud de acceso.'))
    } finally { setBusy(false) }
  }

  return (
    <main className="auth-page">
      <section className="access-card mx-auto max-w-lg" aria-labelledby="signup-title">
        <a className="auth-brand" href="/" aria-label="SISLAB, Sistema de Laboratorios, inicio">
          <img src="/images/logo.svg" alt="" />
          <span className="auth-brand-copy"><strong>SISLAB</strong><span>Sistema de Laboratorios</span></span>
        </a>
        <p className="island-kicker">Acceso a SISLAB</p>
        <h1 id="signup-title" className="mt-2 text-3xl font-bold">{user ? 'Ya tienes una sesión activa' : 'Solicitar acceso'}</h1>
        {user ? <><p className="mt-3">Iniciaste sesión como {user.name} ({user.email}).</p><a className="button-primary mt-5 w-full" href="/app/dashboard">Ir a mi espacio</a></> : <>
          {!submitted && <form className="mt-6 grid gap-4" onSubmit={submit}>
            <label className="field-label">Nombre<input className="field-control" name="name" autoComplete="given-name" required /></label>
            <label className="field-label">Apellidos<input className="field-control" name="surname" autoComplete="family-name" required /></label>
            <label className="field-label">Correo electrónico<input className="field-control" name="email" type="email" autoComplete="email" required /></label>
            <label className="field-label">Contraseña<input className="field-control" name="password" type="password" autoComplete="new-password" minLength={12} required /><span className="font-normal text-[var(--muted-foreground)]">Usa al menos 12 caracteres.</span></label>
            <button className="button-primary w-full" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Solicitar acceso'}</button>
          </form>}
          {message && <output className="mt-4 block text-sm" role="status">{message}</output>}
          <p className="mt-5 text-sm text-[var(--muted-foreground)]">¿Ya tienes acceso? <Link className="font-bold text-primary-text underline" to="/sign-in">Ingresar</Link></p>
        </>}
      </section>
    </main>
  )
}
