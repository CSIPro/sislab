import { createFileRoute, redirect } from "@tanstack/react-router";

// Cuentas is now the "Solicitudes de acceso" tab of Usuarios.
export const Route = createFileRoute("/app/admin/accounts")({
	beforeLoad: () => {
		throw redirect({
			to: "/app/admin/users",
			search: { tab: "access-requests" },
		});
	},
});
