import type { CatalogKind } from "#/server/catalogs.ts";

export const catalogKinds = ["labs", "careers", "subjects"] as const;

export function isCatalogKind(value: string): value is CatalogKind {
	return (catalogKinds as readonly string[]).includes(value);
}

/** The Spanish wording of each catalog. Its noun's gender changes the adjectives. */
export const catalogCopy: Record<
	CatalogKind,
	{
		title: string;
		noun: string;
		newLabel: string;
		description: string;
		placeholder: string;
		statusLabels: readonly [active: string, retired: string];
		emptyText: string;
		noMatchText: string;
		chooseText: string;
	}
> = {
	labs: {
		title: "Laboratorios",
		noun: "laboratorio",
		newLabel: "Nuevo laboratorio",
		description: "Los laboratorios donde los grupos tienen sus sesiones.",
		placeholder: "Por ejemplo, SN-210",
		statusLabels: ["Activo", "Desactivado"],
		emptyText: "Aún no hay laboratorios. Agrega el primero.",
		noMatchText: "Ningún laboratorio coincide con la búsqueda.",
		chooseText: "Elige un laboratorio para ver su detalle.",
	},
	careers: {
		title: "Carreras",
		noun: "carrera",
		newLabel: "Nueva carrera",
		description: "Las carreras a las que pertenecen los grupos.",
		placeholder: "Nombre de la carrera",
		statusLabels: ["Activa", "Desactivada"],
		emptyText: "Aún no hay carreras. Agrega la primera.",
		noMatchText: "Ninguna carrera coincide con la búsqueda.",
		chooseText: "Elige una carrera para ver su detalle.",
	},
	subjects: {
		title: "Materias",
		noun: "materia",
		newLabel: "Nueva materia",
		description: "Las materias que cursan los grupos.",
		placeholder: "Nombre de la materia",
		statusLabels: ["Activa", "Desactivada"],
		emptyText: "Aún no hay materias. Agrega la primera.",
		noMatchText: "Ninguna materia coincide con la búsqueda.",
		chooseText: "Elige una materia para ver su detalle.",
	},
};
