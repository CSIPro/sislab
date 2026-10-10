import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { signUpFn } from "../server/account-functions.ts";

export const Route = createFileRoute("/sign-up")({
	component: SignUpPage,
});

function SignUpPage() {
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
			setMessage(
				"Your request was received. An administrator must verify your identity and activate your account before you can sign in.",
			);
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Could not submit your account request.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-lg rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Sislab account</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)]">
					Request professor access
				</h1>
				{!submitted && (
					<form className="mt-6 grid gap-4" onSubmit={submit}>
						<label className="grid gap-1 text-sm font-medium">
							First name
							<input
								className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
								name="name"
								autoComplete="given-name"
								required
							/>
						</label>
						<label className="grid gap-1 text-sm font-medium">
							Last name
							<input
								className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
								name="surname"
								autoComplete="family-name"
								required
							/>
						</label>
						<label className="grid gap-1 text-sm font-medium">
							Email
							<input
								className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
								name="email"
								type="email"
								autoComplete="email"
								required
							/>
						</label>
						<label className="grid gap-1 text-sm font-medium">
							Password
							<input
								className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
								name="password"
								type="password"
								autoComplete="new-password"
								minLength={12}
								required
							/>
							<span className="font-normal text-[var(--sea-ink-soft)]">
								Use at least 12 characters.
							</span>
						</label>
						<button
							className="rounded-full bg-[var(--lagoon-deep)] px-5 py-2.5 font-semibold text-white disabled:opacity-60"
							type="submit"
							disabled={busy}
						>
							{busy ? "Submitting…" : "Request account"}
						</button>
					</form>
				)}
				{message && <output className="mt-4 block text-sm">{message}</output>}
				<p className="mt-5 text-sm">
					Already activated?{" "}
					<Link className="font-semibold underline" to="/sign-in">
						Sign in
					</Link>
				</p>
			</section>
		</main>
	);
}
