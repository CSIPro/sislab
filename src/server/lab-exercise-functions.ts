import { createServerFn } from "@tanstack/react-start";
import type {
	ExerciseMaterials,
	QuantityItem,
	WasteItem,
} from "../db/schema.ts";
import { db } from "../db/index.ts";
import {
	createLabExercise,
	listActiveLabExercises,
	listLabExercises,
	retireLabExercise,
	updateLabExercise,
} from "./lab-exercises.ts";
import { requireRole, requireUser } from "./auth.server.ts";

export const listActiveLabExercisesFn = createServerFn({
	method: "GET",
}).handler(async () => {
	await requireUser();
	return listActiveLabExercises(db);
});

export const listLabExercisesFn = createServerFn({ method: "GET" }).handler(
	async () => listLabExercises(db, await requireAdmin()),
);

export const createLabExerciseFn = createServerFn({ method: "POST" })
	.validator(parseInput)
	.handler(async ({ data }) =>
		createLabExercise(db, await requireAdmin(), data),
	);

export const updateLabExerciseFn = createServerFn({ method: "POST" })
	.validator(parseUpdateInput)
	.handler(async ({ data }) =>
		updateLabExercise(db, await requireAdmin(), data.id, data.input),
	);

export const retireLabExerciseFn = createServerFn({ method: "POST" })
	.validator(parseId)
	.handler(async ({ data }) =>
		retireLabExercise(db, await requireAdmin(), data.id),
	);

async function requireAdmin() {
	return requireRole("admin");
}

function parseInput(input: unknown): {
	number: string;
	name: string;
	materials: ExerciseMaterials;
} {
	const data = record(input, "Exercise details are required.");
	if (typeof data.number !== "string")
		throw new Error("Enter an exercise number or label.");
	if (typeof data.name !== "string") throw new Error("Enter an exercise name.");
	return {
		number: data.number,
		name: data.name,
		materials: parseMaterials(data.materials),
	};
}

function parseUpdateInput(input: unknown): {
	id: string;
	input: ReturnType<typeof parseInput>;
} {
	const data = record(input, "Exercise details are required.");
	return { id: parseIdValue(data.id), input: parseInput(data) };
}

function parseId(input: unknown): { id: string } {
	const data = record(input, "Exercise details are required.");
	return { id: parseIdValue(data.id) };
}

function parseIdValue(value: unknown): string {
	if (
		typeof value !== "string" ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			value,
		)
	) {
		throw new Error("Choose a valid lab exercise.");
	}
	return value;
}

function parseMaterials(input: unknown): ExerciseMaterials {
	const data = record(input, "Enter the exercise material requirements.");
	return {
		reagents: parseQuantityItems(data.reagents),
		equipment: parseQuantityItems(data.equipment),
		waste: parseWasteItems(data.waste),
	};
}

function parseQuantityItems(input: unknown): QuantityItem[] {
	if (!Array.isArray(input) || !input.every(isRecord)) {
		throw new Error("Material requirements must be lists of items.");
	}
	return input.map((item) => {
		if (typeof item.name !== "string" || typeof item.unit !== "string") {
			throw new Error("Enter each material name and unit.");
		}
		if (typeof item.amount !== "number" || !Number.isFinite(item.amount)) {
			throw new Error("Enter a numeric material amount.");
		}
		if (item.basis !== "team" && item.basis !== "group") {
			throw new Error("Choose per team or per group for each quantity.");
		}
		return {
			name: item.name,
			amount: item.amount,
			unit: item.unit,
			basis: item.basis,
		};
	});
}

function parseWasteItems(input: unknown): WasteItem[] {
	if (!Array.isArray(input) || !input.every(isRecord)) {
		throw new Error("Waste details must be a list of items.");
	}
	return input.map((item) => {
		if (
			typeof item.name !== "string" ||
			typeof item.container !== "string" ||
			typeof item.treatment !== "string"
		) {
			throw new Error("Enter each waste name, container, and treatment.");
		}
		return {
			name: item.name,
			container: item.container,
			treatment: item.treatment,
		};
	});
}

function record(input: unknown, message: string): Record<string, unknown> {
	if (!isRecord(input)) throw new Error(message);
	return input;
}

function isRecord(input: unknown): input is Record<string, unknown> {
	return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}
