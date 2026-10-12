import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Page, PageHeader } from "../components/page.tsx";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../components/ui/card.tsx";
import { catalogCopy, catalogKinds } from "../lib/catalog-copy.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import { listCatalogEntriesFn } from "../server/catalog-functions.ts";

export const Route = createFileRoute("/app/admin/catalogs/")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		const [labs, careers, subjects] = await Promise.all(
			catalogKinds.map((kind) => listCatalogEntriesFn({ data: { kind } })),
		);
		return { labs, careers, subjects };
	},
	component: CatalogsPage,
});

function CatalogsPage() {
	const entries = Route.useLoaderData();

	return (
		<Page size="compact">
			<PageHeader
				description="Las listas que se usan al registrar grupos. Elige una para agregar, renombrar o desactivar sus elementos."
				title="Catálogos"
			/>

			<div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6">
				{catalogKinds.map((kind) => {
					const catalog = catalogCopy[kind];
					const count = entries[kind].length;
					return (
						<Card
							asChild
							className="text-card-foreground no-underline transition-colors hover:border-primary hover:bg-accent hover:text-card-foreground"
							key={kind}
						>
							<Link params={{ kind }} to="/app/admin/catalogs/$kind">
								<CardHeader>
									<CardTitle>{catalog.title}</CardTitle>
									<ChevronRight
										aria-hidden="true"
										className="text-muted-foreground"
										size={20}
									/>
								</CardHeader>
								<CardDescription>{catalog.description}</CardDescription>
								<span className="text-[13.5px] text-muted-foreground">
									{count === 1 ? "1 elemento" : `${count} elementos`}
								</span>
							</Link>
						</Card>
					);
				})}
			</div>
		</Page>
	);
}
