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
		<main className="auth-page">
			<AccessCard initialMode="in" user={null} />
		</main>
	);
}
