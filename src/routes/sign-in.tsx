import { createFileRoute, redirect } from "@tanstack/react-router";
import AccessCard from "../components/AccessCard.tsx";
import { getCurrentSessionFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/sign-in")({
	beforeLoad: async () => {
		if (await getCurrentSessionFn()) throw redirect({ to: "/app/dashboard" });
	},
	component: SignInPage,
});

function SignInPage() {
	return (
		<main className="grid min-h-[calc(100vh-73px)] place-items-center bg-muted bg-[url(/images/background.jpg)] bg-cover bg-center px-4 py-12">
			<AccessCard initialMode="in" user={null} />
		</main>
	);
}
