import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getCurrentSessionFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/app/dashboard")({
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
				<p className="island-kicker mb-2">Espacio de trabajo</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--foreground)]">
					Hola, {user.name}
				</h1>
				<p className="text-[var(--muted-foreground)]">{user.email}</p>
				{user.roles.includes("professor") && (
					<div className="mt-4 flex flex-wrap gap-4">
						<Link className="font-semibold underline" to="/app/groups/new">
							Registrar grupo
						</Link>
						<Link className="font-semibold underline" to="/app/groups/manage">
							Mis grupos
						</Link>
					</div>
				)}
				{user.roles.includes("admin") && (
					<div className="mt-4 flex flex-wrap gap-4">
						<Link className="font-semibold underline" to="/app/admin/users">
							Usuarios
						</Link>
						<Link className="font-semibold underline" to="/app/admin/accounts">
							Solicitudes de acceso
						</Link>
						<Link className="font-semibold underline" to="/app/admin/groups">
							Administrar grupos
						</Link>
						<Link className="font-semibold underline" to="/app/admin/periods">
							Periodos académicos
						</Link>
						<Link className="font-semibold underline" to="/app/admin/catalogs">
							Catálogos
						</Link>
					</div>
				)}
			</section>
		</main>
	);
}
