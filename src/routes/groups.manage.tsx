import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import { getProfessorGroupOptionsFn } from "../server/group-functions.ts";
import {
	deactivateMyGroupFn,
	listMyGroupsFn,
	reactivateMyGroupFn,
	updateMyGroupFn,
} from "../server/group-management-functions.ts";

export const Route = createFileRoute("/groups/manage")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("professor")) throw redirect({ to: "/dashboard" });
		const [groups, options] = await Promise.all([
			listMyGroupsFn({ data: { includeInactive: false } }),
			getProfessorGroupOptionsFn(),
		]);
		return { groups, options };
	},
	component: ManageGroupsPage,
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

function ManageGroupsPage() {
	const { groups: initialGroups, options } = Route.useLoaderData();
	const [groups, setGroups] = useState(initialGroups);
	const [includeInactive, setIncludeInactive] = useState(false);
	const [message, setMessage] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);

	async function showGroups(showInactive: boolean) {
		setIncludeInactive(showInactive);
		setGroups(
			await listMyGroupsFn({ data: { includeInactive: showInactive } }),
		);
	}

	async function save(event: FormEvent<HTMLFormElement>, groupId: string) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const current = groups.find((group) => group.id === groupId);
		if (!current) return;
		setBusyId(groupId);
		setMessage("");
		try {
			await updateMyGroupFn({
				data: {
					groupId,
					input: {
						periodCode: String(form.get("periodCode") ?? ""),
						number: Number(form.get("number")),
						labId: String(form.get("labId") ?? ""),
						careerId: String(form.get("careerId") ?? ""),
						subjectId: String(form.get("subjectId") ?? ""),
						students: Number(form.get("students")),
						teams: Number(form.get("teams")),
						weekday: Number(form.get("weekday")),
						startTime: String(form.get("startTime") ?? ""),
						endTime: String(form.get("endTime") ?? ""),
					},
				},
			});
			setMessage(`Group ${current.number} was updated.`);
			await showGroups(includeInactive);
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Could not update this group.",
			);
		} finally {
			setBusyId(null);
		}
	}

	async function changeActivity(groupId: string, active: boolean) {
		setBusyId(groupId);
		setMessage("");
		try {
			if (active) await deactivateMyGroupFn({ data: { groupId } });
			else await reactivateMyGroupFn({ data: { groupId } });
			await showGroups(includeInactive);
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Could not change this group.",
			);
		} finally {
			setBusyId(null);
		}
	}

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell mx-auto max-w-5xl rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Professor workspace</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)]">
					My groups
				</h1>
				<p className="text-[var(--sea-ink-soft)]">
					Review your group details, make corrections, or deactivate a group
					that is no longer taught.
				</p>
				<div className="mt-5 flex flex-wrap gap-4">
					<button
						className="font-semibold underline"
						onClick={() => void showGroups(false)}
						type="button"
					>
						Active groups
					</button>
					<button
						className="font-semibold underline"
						onClick={() => void showGroups(true)}
						type="button"
					>
						Include inactive groups
					</button>
					<Link className="font-semibold underline" to="/groups/new">
						Register a group
					</Link>
				</div>
				{message && (
					<output aria-live="polite" className="mt-4 block">
						{message}
					</output>
				)}
				{groups.length === 0 && (
					<p className="mt-6">
						No {includeInactive ? "groups" : "active groups"} to show.
					</p>
				)}
				<div className="mt-6 grid gap-5">
					{groups.map((group) => (
						<article
							className="rounded-xl border border-[var(--line)] p-4"
							key={group.id}
						>
							<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
								<h2 className="text-xl font-semibold">
									{group.periodCode} · Group {group.number}
								</h2>
								<div className="flex items-center gap-3">
									<span>{group.active ? "Active" : "Inactive"}</span>
									<button
										className="font-semibold underline"
										disabled={busyId === group.id}
										onClick={() => void changeActivity(group.id, group.active)}
										type="button"
									>
										{group.active ? "Deactivate" : "Reactivate"}
									</button>
								</div>
							</div>
							<form
								className="grid gap-4 sm:grid-cols-2"
								onSubmit={(event) => void save(event, group.id)}
							>
								<label className="grid gap-1 text-sm font-medium">
									Academic period
									<select
										className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
										defaultValue={group.periodCode}
										name="periodCode"
										required
									>
										{!options.periods.some(
											({ code }) => code === group.periodCode,
										) && (
											<option value={group.periodCode}>
												{group.periodCode}
											</option>
										)}
										{options.periods.map(({ code }) => (
											<option key={code} value={code}>
												{code}
											</option>
										))}
									</select>
								</label>
								<Field
									label="Group number"
									name="number"
									type="number"
									min="1"
									value={group.number}
								/>
								<CatalogSelect
									label="Lab"
									name="labId"
									current={{ id: group.labId, name: group.labName }}
									entries={options.labs}
								/>
								<CatalogSelect
									label="Career"
									name="careerId"
									current={{ id: group.careerId, name: group.careerName }}
									entries={options.careers}
								/>
								<CatalogSelect
									label="Subject"
									name="subjectId"
									current={{ id: group.subjectId, name: group.subjectName }}
									entries={options.subjects}
								/>
								<Field
									label="Students"
									name="students"
									type="number"
									min="1"
									max="60"
									value={group.students}
								/>
								<Field
									label="Teams"
									name="teams"
									type="number"
									min="1"
									value={group.teams}
								/>
								<label className="grid gap-1 text-sm font-medium">
									Weekday
									<select
										className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
										defaultValue={group.weekday}
										name="weekday"
									>
										{weekdays.map((day, index) => (
											<option key={day} value={index}>
												{day}
											</option>
										))}
									</select>
								</label>
								<Field
									label="Start time"
									name="startTime"
									type="time"
									value={group.startTime.slice(0, 5)}
								/>
								<Field
									label="End time"
									name="endTime"
									type="time"
									value={group.endTime.slice(0, 5)}
								/>
								<div className="sm:col-span-2">
									<button
										className="rounded-full bg-[var(--lagoon-deep)] px-5 py-2.5 font-semibold text-white disabled:opacity-60"
										disabled={busyId === group.id}
										type="submit"
									>
										{busyId === group.id ? "Saving…" : "Save changes"}
									</button>
								</div>
							</form>
						</article>
					))}
				</div>
			</section>
		</main>
	);
}

function Field({
	label,
	name,
	type,
	value,
	min,
	max,
}: {
	label: string;
	name: string;
	type: string;
	value: string | number;
	min?: string;
	max?: string;
}) {
	return (
		<label className="grid gap-1 text-sm font-medium">
			{label}
			<input
				className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
				defaultValue={value}
				max={max}
				min={min}
				name={name}
				type={type}
				required
			/>
		</label>
	);
}

function CatalogSelect({
	label,
	name,
	current,
	entries,
}: {
	label: string;
	name: string;
	current: { id: string; name: string };
	entries: Array<{ id: string; name: string }>;
}) {
	return (
		<label className="grid gap-1 text-sm font-medium">
			{label}
			<select
				className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2"
				defaultValue={current.id}
				name={name}
				required
			>
				{!entries.some(({ id }) => id === current.id) && (
					<option value={current.id}>{current.name} (saved label)</option>
				)}
				{entries.map(({ id, name: entryName }) => (
					<option key={id} value={id}>
						{entryName}
					</option>
				))}
			</select>
		</label>
	);
}
