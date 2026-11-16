import type { UserRole } from "../server/user-access.ts";

export const roleLabels: Record<UserRole, string> = {
	admin: "Administración",
	staff: "Personal de laboratorio",
	professor: "Docente",
};

/** What each role lets a person do, shown when an admin picks roles. */
export const roleDescriptions: Record<UserRole, string> = {
	admin:
		"Gestiona usuarios, períodos, catálogos y ajustes. Incluye los permisos del personal de laboratorio.",
	staff:
		"Revisa y prepara las solicitudes, imprime el ticket diario y decide sobre las solicitudes fuera de plazo.",
	professor: "Registra sus grupos y envía solicitudes de preparación.",
};

/** Every role, in the order the app shows them: Administración, Personal de laboratorio, Docente. */
export const allRoles: readonly UserRole[] = ["admin", "staff", "professor"];

/** A copy of `roles` in the order of `allRoles`. */
export function sortRoles(roles: readonly UserRole[]): UserRole[] {
	return allRoles.filter((role) => roles.includes(role));
}

/** "ED" for Elena Duarte. Shown where the app has no photo of the person. */
export function initials(person: { name: string; surname: string }): string {
	return `${person.name.trim().charAt(0)}${person.surname.trim().charAt(0)}`.toLocaleUpperCase(
		"es-MX",
	);
}
