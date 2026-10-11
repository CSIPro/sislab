import { createFileRoute } from "@tanstack/react-router";
import AccessCard from "../components/AccessCard.tsx";
import { getCurrentSessionFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/sign-up")({
	loader: () => getCurrentSessionFn(),
	component: SignUpPage,
});

function SignUpPage() {
	const user = Route.useLoaderData();
	return (
		<main className="auth-page">
			<AccessCard initialMode="up" user={user} />
		</main>
	);
}
