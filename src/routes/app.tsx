import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { AppSidebar, MobileTopBar } from "../components/app-sidebar.tsx";
import { SidebarProvider } from "../components/ui/sidebar.tsx";
import { withBase } from "../lib/base-path.ts";
import { listAcademicPeriodsFn } from "../server/academic-period-functions.ts";
import { getCurrentSessionFn, signOutFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/app")({
	beforeLoad: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		const periodOptions = await listAcademicPeriodsFn();
		return { user, periodCode: periodOptions.suggestedCode };
	},
	component: AppLayout,
});

function AppLayout() {
	const { user } = Route.useRouteContext();

	async function signOut() {
		await signOutFn();
		window.location.assign(withBase("/"));
	}

	return (
		// The desktop sidebar never collapses, so `open` stays true. Phones get a drawer.
		<SidebarProvider
			onOpenChange={() => {}}
			open
			style={{ "--sidebar-width": "264px" } as CSSProperties}
		>
			<AppSidebar onSignOut={signOut} user={user} />
			<div className="flex min-w-0 flex-1 flex-col bg-background">
				<MobileTopBar />
				<Outlet />
			</div>
		</SidebarProvider>
	);
}
