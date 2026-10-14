import type { UserRole } from "../server/user-access.ts";

export const roleLabels: Record<UserRole, string> = {
	professor: "Docente",
	staff: "Personal de laboratorio",
	admin: "Administración",
};

export const allRoles = Object.keys(roleLabels) as UserRole[];

/** "ED" for Elena Duarte. Shown where the app has no photo of the person. */
export function initials(person: { name: string; surname: string }): string {
	return `${person.name.trim().charAt(0)}${person.surname.trim().charAt(0)}`.toLocaleUpperCase(
		"es-MX",
	);
}
