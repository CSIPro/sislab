import type {
	ExerciseMaterials,
	QuantityItem,
	WasteItem,
} from "../db/schema.ts";

/** The legacy SISLAB API responses saved in `docs/legacy-data`. */
export type LegacyLabs = { laboratorios: { laboratorio: string }[] };
export type LegacyCareers = { carreras: { carrera: string }[] };
export type LegacySubjects = { materias: { materia: string }[] };
export type LegacyReagent = {
	reagent: string;
	quantity?: number;
	unit?: string;
	alternatives?: { reagent: string }[];
};
export type LegacyExercise = {
	number: string;
	name: string;
	reagents: { groups: { reagents: LegacyReagent[] }[] };
	equipment: string[];
	waste: { residue?: string; container?: string; treatment: string }[];
};
export type LegacyExercises = { assignments: LegacyExercise[] };

export type SeedExercise = {
	number: string;
	name: string;
	materials: ExerciseMaterials;
};

export function legacyCatalogs(
	labs: LegacyLabs,
	careers: LegacyCareers,
	subjects: LegacySubjects,
): { labs: string[]; careers: string[]; subjects: string[] } {
	return {
		labs: labs.laboratorios.map(({ laboratorio }) => legacyText(laboratorio)),
		careers: careers.carreras.map(({ carrera }) => legacyText(carrera)),
		subjects: subjects.materias.map(({ materia }) => legacyText(materia)),
	};
}

/**
 * Legacy quantities are per team. Reagents and equipment without a quantity,
 * and waste without a residue or container, keep those fields empty.
 */
export function legacyExercises(legacy: LegacyExercises): SeedExercise[] {
	return legacy.assignments.map((exercise) => ({
		number: legacyText(exercise.number),
		name: legacyText(exercise.name),
		materials: {
			reagents: exercise.reagents.groups.flatMap((group) =>
				group.reagents.map(legacyReagent),
			),
			equipment: exercise.equipment.map((name) =>
				legacyReagent({ reagent: name }),
			),
			waste: exercise.waste.map(
				(item): WasteItem => ({
					name: item.residue ? legacyText(item.residue) : null,
					container: item.container ? legacyText(item.container) : null,
					treatment: legacyText(item.treatment),
				}),
			),
		},
	}));
}

function legacyReagent(reagent: LegacyReagent): QuantityItem {
	const alternatives = reagent.alternatives?.map((alternative) =>
		legacyText(alternative.reagent),
	);
	const name = legacyText(reagent.reagent);
	const quantified = reagent.quantity !== undefined && Boolean(reagent.unit);
	return {
		// The new model has no alternatives, so they stay readable in the name.
		name: alternatives?.length
			? `${name} (alternativas: ${alternatives.join(", ")})`
			: name,
		amount: quantified ? (reagent.quantity ?? null) : null,
		unit: quantified ? (reagent.unit ?? null) : null,
		basis: "team",
	};
}

/**
 * Decodes the numeric HTML entities the legacy editor saved, such as
 * "&#8324;" for "₄". "H&822;SO&8324;" lost its "#" and one digit, so an entity
 * without "#" also decodes, and a three-digit code gets its missing "2".
 */
export function legacyText(value: string): string {
	return value
		.replace(/&#?(\d+);/g, (_entity, digits: string) =>
			String.fromCodePoint(Number(digits === "822" ? "8322" : digits)),
		)
		.trim();
}
