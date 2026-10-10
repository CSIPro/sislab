import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getCurrentSessionFn, signOutFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/dashboard")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		return { user };
	},
	component: DashboardPage,
});

function DashboardPage() {
	const { user } = Route.useLoaderData();
	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Signed in</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)]">
					Welcome, {user.name}
				</h1>
				<p className="text-[var(--sea-ink-soft)]">{user.email}</p>
				{user.roles.includes("professor") && (
					<div className="mt-4 flex flex-wrap gap-4">
						<Link className="font-semibold underline" to="/groups/new">
							Register a group
						</Link>
						<Link className="font-semibold underline" to="/groups/manage">
							Manage my groups
						</Link>
					</div>
				)}
				{user.roles.includes("admin") && (
					<div className="mt-4 flex flex-wrap gap-4">
						<Link className="font-semibold underline" to="/admin/users">
							Manage user access
						</Link>
						<Link className="font-semibold underline" to="/admin/accounts">
							Review pending professor accounts
						</Link>
					</div>
				)}
				<form
					action="/"
					method="post"
					onSubmit={async (event) => {
						event.preventDefault();
						await signOutFn();
						window.location.assign("/sign-in");
					}}
				>
					<button
						className="rounded-full border border-[var(--line)] px-5 py-2.5 font-semibold"
						type="submit"
					>
						Sign out
					</button>
				</form>
			</section>
		</main>
	);
}
