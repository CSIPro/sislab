import { asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../db/schema.ts";
import { labExercises, type ExerciseMaterials } from "../db/schema.ts";

export type LabExerciseDatabase = NodePgDatabase<typeof schema>;
export type LabExercise = typeof labExercises.$inferSelect;
export type LabExerciseInput = {
	number: string;
	name: string;
	materials: ExerciseMaterials;
};
export type LabExerciseActor = { roles: string[] };

export async function listActiveLabExercises(
	database: LabExerciseDatabase,
): Promise<LabExercise[]> {
	return database
		.select()
		.from(labExercises)
		.where(eq(labExercises.active, true))
		.orderBy(asc(labExercises.number), asc(labExercises.name));
}

export async function listLabExercises(
	database: LabExerciseDatabase,
	actor: LabExerciseActor,
): Promise<LabExercise[]> {
	requireAdmin(actor);
	return database
		.select()
		.from(labExercises)
		.orderBy(asc(labExercises.number), asc(labExercises.name));
}

export async function createLabExercise(
	database: LabExerciseDatabase,
	actor: LabExerciseActor,
	input: LabExerciseInput,
): Promise<LabExercise> {
	requireAdmin(actor);
	const normalized = normalizeInput(input);
	const [created] = await database
		.insert(labExercises)
		.values({ ...normalized, active: true })
		.returning();
	if (!created) throw new Error("Could not save the lab exercise.");
	return created;
}

export async function updateLabExercise(
	database: LabExerciseDatabase,
	actor: LabExerciseActor,
	id: string,
	input: LabExerciseInput,
): Promise<LabExercise> {
	requireAdmin(actor);
	const normalized = normalizeInput(input);
	const [updated] = await database
		.update(labExercises)
		.set(normalized)
		.where(eq(labExercises.id, id))
		.returning();
	if (!updated) throw new Error("Lab exercise not found.");
	return updated;
}

export async function retireLabExercise(
	database: LabExerciseDatabase,
	actor: LabExerciseActor,
	id: string,
): Promise<LabExercise> {
	requireAdmin(actor);
	const [retired] = await database
		.update(labExercises)
		.set({ active: false })
		.where(eq(labExercises.id, id))
		.returning();
	if (!retired) throw new Error("Lab exercise not found.");
	return retired;
}

function normalizeInput(input: LabExerciseInput): LabExerciseInput {
	const number = input.number.trim();
	const name = input.name.trim();
	if (!number) throw new Error("Enter an exercise number or label.");
	if (!name) throw new Error("Enter an exercise name.");
	if (number.length > 60)
		throw new Error("Exercise labels must be 60 characters or fewer.");
	if (name.length > 160)
		throw new Error("Exercise names must be 160 characters or fewer.");
	return { number, name, materials: normalizeMaterials(input.materials) };
}

function normalizeMaterials(materials: ExerciseMaterials): ExerciseMaterials {
	if (!materials || typeof materials !== "object") {
		throw new Error("Enter the exercise material requirements.");
	}
	return {
		reagents: normalizeQuantityItems(materials.reagents, "reagents"),
		equipment: normalizeQuantityItems(materials.equipment, "equipment"),
		waste: normalizeWasteItems(materials.waste),
	};
}

function normalizeQuantityItems(
	items: ExerciseMaterials["reagents"],
	label: string,
): ExerciseMaterials["reagents"] {
	if (!Array.isArray(items) || items.length > 100) {
		throw new Error(`Enter up to 100 ${label} items.`);
	}
	return items.map((item) => {
		const name = item.name.trim();
		const unit = item.unit.trim();
		if (!name || name.length > 120)
			throw new Error(
				"Material names are required and limited to 120 characters.",
			);
		if (!Number.isFinite(item.amount) || item.amount <= 0)
			throw new Error("Material amounts must be greater than zero.");
		if (!unit || unit.length > 40)
			throw new Error("Enter a material unit of 40 characters or fewer.");
		if (item.basis !== "team" && item.basis !== "group")
			throw new Error("Choose per team or per group for each quantity.");
		return { name, amount: item.amount, unit, basis: item.basis };
	});
}

function normalizeWasteItems(
	items: ExerciseMaterials["waste"],
): ExerciseMaterials["waste"] {
	if (!Array.isArray(items) || items.length > 100)
		throw new Error("Enter up to 100 waste details.");
	return items.map((item) => {
		const name = item.name.trim();
		const container = item.container.trim();
		const treatment = item.treatment.trim();
		if (!name || name.length > 120)
			throw new Error(
				"Waste names are required and limited to 120 characters.",
			);
		if (!container || container.length > 120)
			throw new Error("Enter a waste container of 120 characters or fewer.");
		if (!treatment || treatment.length > 240)
			throw new Error("Enter a waste treatment of 240 characters or fewer.");
		return { name, container, treatment };
	});
}

function requireAdmin(actor: LabExerciseActor): void {
	if (!actor.roles.includes("admin"))
		throw new Error("Admin access is required.");
}
