import { type FormEvent, useState } from "react";
import { userFacingError } from "../lib/user-facing-error.ts";
import { signUpFn } from "../server/account-functions.ts";
import { signInFn } from "../server/auth-functions.ts";

type AccessMode = "in" | "up";

export default function AccessCard({
	initialMode = "in",
	user,
}: {
	initialMode?: AccessMode;
	user: { name: string } | null;
}) {
	const [mode, setMode] = useState<AccessMode>(initialMode);

	return (
		<section aria-label="Acceso a SISLAB" className="access-card">
			<a
				aria-label="SISLAB, Sistema de Laboratorios, inicio"
				className="access-brand"
				href="/"
			>
				<span className="access-brand-mark">
					<img src="/images/logo.svg" alt="" />
					SISLAB
				</span>
				Sistema de Laboratorios
			</a>
			{user ? (
				<div className="access-form access-session">
					<p className="landing-eyebrow">Sesión activa</p>
					<h2>Hola, {user.name}</h2>
					<p>Ya iniciaste sesión en SISLAB.</p>
					<a className="button-primary" href="/app/dashboard">
						Ir a mi espacio
					</a>
				</div>
			) : (
				<>
					<div aria-label="Acceso" className="access-tabs" role="tablist">
						<button
							aria-controls="access-panel"
							aria-selected={mode === "in"}
							className="access-tab"
							id="access-tab-in"
							onClick={() => setMode("in")}
							role="tab"
							type="button"
						>
							Ingresar
						</button>
						<button
							aria-controls="access-panel"
							aria-selected={mode === "up"}
							className="access-tab"
							id="access-tab-up"
							onClick={() => setMode("up")}
							role="tab"
							type="button"
						>
							Crear cuenta
						</button>
					</div>
					<div
						aria-labelledby={`access-tab-${mode}`}
						id="access-panel"
						role="tabpanel"
					>
						{mode === "in" ? <SignInForm /> : <SignUpForm />}
					</div>
				</>
			)}
		</section>
	);
}

function SignInForm() {
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setMessage("");
		const form = new FormData(event.currentTarget);
		try {
			const result = await signInFn({
				data: {
					email: String(form.get("email") ?? ""),
					password: String(form.get("password") ?? ""),
				},
			});
			if (!result.ok) {
				setMessage(result.message);
				return;
			}
			window.location.assign("/app/dashboard");
		} catch {
			setMessage(
				"No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<form className="access-form" method="post" onSubmit={submit}>
			<label className="field-label">
				Correo institucional
				<input
					autoComplete="username"
					className="field"
					name="email"
					placeholder="nombre@unison.mx"
					required
					type="email"
				/>
			</label>
			<label className="field-label">
				Contraseña
				<input
					autoComplete="current-password"
					className="field"
					name="password"
					placeholder="Tu contraseña"
					required
					type="password"
				/>
			</label>
			<p className="access-note">
				¿Olvidaste tu contraseña? Pide a un administrador que la restablezca.
			</p>
			{message && (
				<p className="form-error" role="alert">
					{message}
				</p>
			)}
			<button className="button-primary" disabled={busy} type="submit">
				{busy ? "Ingresando…" : "Ingresar"}
			</button>
		</form>
	);
}

function SignUpForm() {
	const [message, setMessage] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [busy, setBusy] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setMessage("");
		const form = new FormData(event.currentTarget);
		try {
			await signUpFn({
				data: {
					email: String(form.get("email") ?? ""),
					name: String(form.get("name") ?? ""),
					surname: String(form.get("surname") ?? ""),
					password: String(form.get("password") ?? ""),
				},
			});
			setSubmitted(true);
		} catch (error) {
			setMessage(
				userFacingError(error, "No se pudo enviar tu solicitud de acceso."),
			);
		} finally {
			setBusy(false);
		}
	}

	if (submitted)
		return (
			<output className="access-note">
				Recibimos tu solicitud. Una persona administradora debe verificar tu
				identidad y activar tu cuenta antes de que puedas ingresar.
			</output>
		);

	return (
		<form className="access-form" onSubmit={submit}>
			<label className="field-label">
				Nombre
				<input
					autoComplete="given-name"
					className="field"
					name="name"
					placeholder="Tu nombre"
					required
				/>
			</label>
			<label className="field-label">
				Apellidos
				<input
					autoComplete="family-name"
					className="field"
					name="surname"
					placeholder="Tus apellidos"
					required
				/>
			</label>
			<label className="field-label">
				Correo institucional
				<input
					autoComplete="email"
					className="field"
					name="email"
					placeholder="nombre@unison.mx"
					required
					type="email"
				/>
			</label>
			<label className="field-label">
				Contraseña
				<input
					autoComplete="new-password"
					className="field"
					minLength={12}
					name="password"
					placeholder="Crea una contraseña"
					required
					type="password"
				/>
				<span className="field-hint">Usa al menos 12 caracteres.</span>
			</label>
			<p className="access-note">
				Un administrador activará tu cuenta después de verificar tu identidad.
			</p>
			{message && (
				<p className="form-error" role="alert">
					{message}
				</p>
			)}
			<button className="button-primary" disabled={busy} type="submit">
				{busy ? "Enviando…" : "Solicitar acceso"}
			</button>
		</form>
	);
}
