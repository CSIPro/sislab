import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	getProfessorGroupOptionsFn,
	registerProfessorGroupFn,
} from "../server/group-functions.ts";

export const Route = createFileRoute("/groups/new")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("professor")) throw redirect({ to: "/dashboard" });
		return getProfessorGroupOptionsFn();
	},
	component: NewGroupPage,
});

const weekdays = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

function NewGroupPage() {
	const options = Route.useLoaderData();
	const [periodCode, setPeriodCode] = useState(
		options.suggestedCode ?? options.periods[0]?.code ?? "",
	);
	const [message, setMessage] = useState("");
	const [createdNumber, setCreatedNumber] = useState<number | null>(null);
	const [busy, setBusy] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		setBusy(true);
		setMessage("");
		setCreatedNumber(null);
		try {
			const group = await registerProfessorGroupFn({
				data: {
					periodCode,
					number: String(form.get("number") ?? "").trim()
						? Number(form.get("number"))
						: null,
					labId: String(form.get("labId") ?? ""),
					careerId: String(form.get("careerId") ?? ""),
					subjectId: String(form.get("subjectId") ?? ""),
					students: Number(form.get("students")),
					teams: Number(form.get("teams")),
					weekday: Number(form.get("weekday")),
					startTime: String(form.get("startTime") ?? ""),
					endTime: String(form.get("endTime") ?? ""),
				},
			});
			setCreatedNumber(group.number);
			setMessage(
				`Group ${group.number} is registered for ${group.periodCode}.`,
			);
			formElement.reset();
			setPeriodCode(options.suggestedCode ?? options.periods[0]?.code ?? "");
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Could not register this group. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-3xl rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Professor workspace</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)]">
					Register a group
				</h1>
				<p className="text-[var(--sea-ink-soft)]">
					Choose an available period and record the lab schedule assigned to your
					group. Sislab does not allocate or reserve lab time. Leave the group
					number blank to assign the next unused number.
				</p>
				{options.periods.length === 0 && (
					<output className="mt-5 rounded-lg border border-[var(--line)] p-3">
						No academic periods are available yet. Ask an administrator to set
						one up.
					</output>
				)}
				{(options.labs.length === 0 ||
					options.careers.length === 0 ||
					options.subjects.length === 0) && (
					<output className="mt-3 rounded-lg border border-[var(--line)] p-3">
						One or more catalogs have no active choices. Ask an administrator to
						complete the catalogs.
					</output>
				)}
				{options.periods.length > 0 &&
					options.labs.length > 0 &&
					options.careers.length > 0 &&
					options.subjects.length > 0 && (
						<form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
							<label className="grid gap-1 text-sm font-medium">
								Academic period
								<select
									className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
									name="periodCode"
									value={periodCode}
									onChange={(event) => setPeriodCode(event.currentTarget.value)}
									required
								>
									{options.periods.map(({ code }) => (
										<option key={code} value={code}>
											{code}
											{code === options.suggestedCode ? " (suggested)" : ""}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Group number (optional)
								<input
									className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
									name="number"
									type="number"
									min="1"
									step="1"
									placeholder="Next available"
								/>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Lab
								<select
									className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
									name="labId"
									required
								>
									{options.labs.map(({ id, name }) => (
										<option key={id} value={id}>
											{name}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Career
								<select
									className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
									name="careerId"
									required
								>
									{options.careers.map(({ id, name }) => (
										<option key={id} value={id}>
											{name}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-1 text-sm font-medium sm:col-span-2">
								Subject
								<select
									className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
									name="subjectId"
									required
								>
									{options.subjects.map(({ id, name }) => (
										<option key={id} value={id}>
											{name}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Students
								<input
									className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
									name="students"
									type="number"
									min="1"
									max="60"
									step="1"
									defaultValue="1"
									required
								/>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Teams
								<input
									className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
									name="teams"
									type="number"
									min="1"
									step="1"
									defaultValue="1"
									required
								/>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Weekday
								<select
									className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
									name="weekday"
									required
								>
									{weekdays.map((day, index) => (
										<option key={day} value={index}>
											{day}
										</option>
									))}
								</select>
							</label>
							<div className="grid grid-cols-2 gap-3">
								<label className="grid gap-1 text-sm font-medium">
									Start time
									<input
										className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
										name="startTime"
										type="time"
										required
									/>
								</label>
								<label className="grid gap-1 text-sm font-medium">
									End time
									<input
										className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
										name="endTime"
										type="time"
										required
									/>
								</label>
							</div>
							<div className="sm:col-span-2">
								<button
									className="rounded-full bg-[var(--lagoon-deep)] px-5 py-2.5 font-semibold text-white disabled:opacity-60"
									disabled={busy}
									type="submit"
								>
									{busy ? "Registering…" : "Register group"}
								</button>
							</div>
						</form>
					)}
				{message && <output className="mt-4 text-sm">{message}</output>}
				{createdNumber !== null && (
					<p className="mt-2 text-sm">
						<Link className="font-semibold underline" to="/dashboard">
							Return to dashboard
						</Link>
					</p>
				)}
			</section>
		</main>
	);
}
