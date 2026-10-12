import { type FormEvent, useState } from "react";
import { Notice } from "#/components/notice.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "#/components/ui/tabs.tsx";
import { withBase } from "#/lib/base-path.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { signUpFn } from "../server/account-functions.ts";
import { signInFn } from "../server/auth-functions.ts";

type AccessMode = "in" | "up";

const tabTrigger =
	"min-h-11 flex-1 cursor-pointer rounded-[10px] border-0 text-[15px] font-medium text-muted-foreground after:hidden data-[state=active]:bg-card data-[state=active]:font-bold data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_2px_rgb(0_0_0/12%)]";
const note = "text-[13.5px] text-muted-foreground";

export default function AccessCard({
	initialMode = "in",
	user,
}: {
	initialMode?: AccessMode;
	user: { name: string } | null;
}) {
	return (
		<section
			aria-label="Acceso a SISLAB"
			className="relative flex w-full max-w-[400px] flex-col gap-5 rounded-2xl bg-card px-7 pt-8 pb-7 shadow-[0_18px_50px_rgb(30_40_38/18%)]"
		>
			<a
				aria-label="SISLAB, Sistema de Laboratorios, inicio"
				className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground no-underline hover:text-muted-foreground"
				href={withBase("/")}
			>
				<span className="flex items-center gap-2.5 text-4xl leading-none font-bold tracking-[0.02em] text-sislab-green">
					<img alt="" className="size-10" src={withBase("/images/logo.svg")} />
					SISLAB
				</span>
				Sistema de Laboratorios
			</a>
			{user ? (
				<div className="flex flex-col gap-4">
					<p className="text-[15px] font-bold text-primary-text">
						Sesión activa
					</p>
					<h2 className="text-[22px] font-bold">Hola, {user.name}</h2>
					<p className="text-muted-foreground">
						Ya iniciaste sesión en SISLAB.
					</p>
					<Button asChild size="lg">
						<a href={withBase("/app/dashboard")}>Ir a mi espacio</a>
					</Button>
				</div>
			) : (
				<Tabs className="gap-5" defaultValue={initialMode}>
					<TabsList
						aria-label="Acceso"
						className="h-auto w-full gap-1 rounded-lg bg-secondary p-1"
					>
						<TabsTrigger className={tabTrigger} value="in">
							Ingresar
						</TabsTrigger>
						<TabsTrigger className={tabTrigger} value="up">
							Crear cuenta
						</TabsTrigger>
					</TabsList>
					<TabsContent value="in">
						<SignInForm />
					</TabsContent>
					<TabsContent value="up">
						<SignUpForm />
					</TabsContent>
				</Tabs>
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
			window.location.assign(withBase("/app/dashboard"));
		} catch {
			setMessage(
				"No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<form className="flex flex-col gap-4" method="post" onSubmit={submit}>
			<Field>
				<FieldLabel htmlFor="sign-in-email">Correo electrónico</FieldLabel>
				<Input
					autoComplete="username"
					name="email"
					placeholder="nombre@correo.com"
					required
					type="email"
					id="sign-in-email"
					variant="filled"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="sign-in-password">Contraseña</FieldLabel>
				<Input
					autoComplete="current-password"
					name="password"
					placeholder="Tu contraseña"
					required
					type="password"
					id="sign-in-password"
					variant="filled"
				/>
			</Field>
			<p className={note}>
				¿Olvidaste tu contraseña? Pide a un administrador que la restablezca.
			</p>
			{message && (
				<p className="text-sm font-bold text-destructive-text" role="alert">
					{message}
				</p>
			)}
			<Button className="text-[17px]" disabled={busy} size="lg" type="submit">
				{busy ? "Ingresando…" : "Ingresar"}
			</Button>
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
			<Notice>
				Recibimos tu solicitud. Una persona administradora debe verificar tu
				identidad y activar tu cuenta antes de que puedas ingresar.
			</Notice>
		);

	return (
		<form className="flex flex-col gap-4" onSubmit={submit}>
			<Field>
				<FieldLabel htmlFor="sign-up-name">Nombre</FieldLabel>
				<Input
					autoComplete="given-name"
					name="name"
					placeholder="Tu nombre"
					required
					id="sign-up-name"
					variant="filled"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="sign-up-surname">Apellidos</FieldLabel>
				<Input
					autoComplete="family-name"
					name="surname"
					placeholder="Tus apellidos"
					required
					id="sign-up-surname"
					variant="filled"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="sign-up-email">Correo electrónico</FieldLabel>
				<Input
					autoComplete="email"
					name="email"
					placeholder="nombre@correo.com"
					required
					type="email"
					id="sign-up-email"
					variant="filled"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="sign-up-password">Contraseña</FieldLabel>
				<Input
					autoComplete="new-password"
					minLength={12}
					name="password"
					placeholder="Crea una contraseña"
					required
					type="password"
					id="sign-up-password"
					variant="filled"
				/>
				<FieldDescription>Usa al menos 12 caracteres.</FieldDescription>
			</Field>
			<p className={note}>
				Un administrador activará tu cuenta después de verificar tu identidad.
			</p>
			{message && (
				<p className="text-sm font-bold text-destructive-text" role="alert">
					{message}
				</p>
			)}
			<Button className="text-[17px]" disabled={busy} size="lg" type="submit">
				{busy ? "Enviando…" : "Solicitar acceso"}
			</Button>
		</form>
	);
}
