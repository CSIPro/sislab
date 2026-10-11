import assert from "node:assert/strict";
import { test } from "node:test";
import type { RequestMaterials } from "../db/schema.ts";
import { buildDailyTicket, type TicketRow } from "./daily-ticket.ts";

const noMaterials: RequestMaterials = {
	reagents: [],
	equipment: [],
	waste: [],
	omittedReagents: [],
	addedReagents: [],
	addedEquipment: [],
	addedWaste: [],
};

const quantity = (name: string, amount: number, unit: string) => ({
	name,
	amount,
	unit,
	basis: "team" as const,
	totalAmount: amount * 6,
});

let nextId = 0;
const row = (
	fields: Partial<{
		exerciseId: string;
		exerciseNumber: string;
		exerciseName: string;
		professor: TicketRow["professor"];
		teams: number;
		sessionDate: string;
		startTime: string;
		endTime: string;
		labName: string;
		professorNote: string | null;
		materials: Partial<RequestMaterials>;
	}> = {},
): TicketRow => ({
	request: {
		id: `request-${++nextId}`,
		exerciseId: fields.exerciseId ?? "exercise-1",
		exerciseNumber: fields.exerciseNumber ?? "3",
		exerciseName: fields.exerciseName ?? "Titulación ácido-base",
		sessionDate: fields.sessionDate ?? "2026-10-14",
		startTime: fields.startTime ?? "08:00:00",
		endTime: fields.endTime ?? "10:00:00",
		labName: fields.labName ?? "Lab 1",
		professorNote: fields.professorNote ?? null,
		materials: { ...noMaterials, ...fields.materials },
	},
	group: { teams: fields.teams ?? 6 },
	professor: fields.professor ?? {
		id: "professor-1",
		name: "Ana",
		surname: "López",
	},
});

test("groups the day's requests by lab exercise, then by professor, keeping their order", () => {
	const ruiz = { id: "professor-2", name: "Luis", surname: "Ruiz" };
	const ticket = buildDailyTicket([
		row(),
		row({ professor: ruiz }),
		row(),
		row({ exerciseId: "exercise-2", exerciseNumber: "7", exerciseName: "pH" }),
	]);
	assert.deepEqual(
		ticket.map((exercise) => ({
			number: exercise.number,
			name: exercise.name,
			professors: exercise.professors.map((professor) => ({
				name: professor.name,
				requests: professor.requests.length,
			})),
		})),
		[
			{
				number: "3",
				name: "Titulación ácido-base",
				professors: [
					{ name: "Ana López", requests: 2 },
					{ name: "Luis Ruiz", requests: 1 },
				],
			},
			{
				number: "7",
				name: "pH",
				professors: [{ name: "Ana López", requests: 1 }],
			},
		],
	);
});

test("describes each group the way the legacy ticket prints it", () => {
	const [exercise] = buildDailyTicket([
		row({
			teams: 5,
			sessionDate: "2026-03-09",
			startTime: "08:00:00",
			endTime: "10:30:00",
			labName: "Química General",
			professorNote: "Llegaremos diez minutos tarde.",
			materials: {
				omittedReagents: ["Fenolftaleína"],
				addedReagents: [quantity("Etanol", 20, "mL")],
				addedEquipment: [quantity("Mechero", 1, "pza")],
				addedWaste: [
					{ name: "Sales", container: "Garrafón B", treatment: "Neutralizar" },
				],
			},
		}),
	]);
	const { id, ...group } = exercise.professors[0].requests[0];
	assert.deepEqual(group, {
		teams: 5,
		date: "09/03/2026",
		timeslot: "8:00 - 10:30",
		lab: "Química General",
		comments: ["Llegaremos diez minutos tarde."],
		omittedReagents: ["Fenolftaleína"],
		customReagents: [{ reagent: "Etanol", quantity: 20, unit: "mL" }],
		customEquipment: ["Mechero"],
		customWaste: [
			{ residue: "Sales", container: "Garrafón B", treatment: "Neutralizar" },
		],
	});
});

test("lists an exercise's materials once, from the snapshots of its requests", () => {
	const materials: Partial<RequestMaterials> = {
		reagents: [
			quantity("HCl 0.1 M", 25, "mL"),
			quantity("NaOH 0.1 M", 50, "mL"),
		],
		equipment: [quantity("Bureta", 1, "pza")],
		waste: [
			{ name: "Ácidos", container: "Garrafón A", treatment: "Neutralizar" },
		],
	};
	const [exercise] = buildDailyTicket([row({ materials }), row({ materials })]);
	assert.deepEqual(exercise.reagents, [
		{ reagent: "HCl 0.1 M", quantity: 25, unit: "mL" },
		{ reagent: "NaOH 0.1 M", quantity: 50, unit: "mL" },
	]);
	assert.deepEqual(exercise.equipment, ["Bureta"]);
	assert.deepEqual(exercise.waste, [
		{ residue: "Ácidos", container: "Garrafón A", treatment: "Neutralizar" },
	]);
});

test("keeps a reagent that a group omitted in the exercise's list", () => {
	const [exercise] = buildDailyTicket([
		row({
			materials: {
				reagents: [quantity("NaOH 0.1 M", 50, "mL")],
				omittedReagents: ["HCl 0.1 M", "Fenolftaleína"],
			},
		}),
		row({
			materials: {
				reagents: [
					quantity("HCl 0.1 M", 25, "mL"),
					quantity("NaOH 0.1 M", 50, "mL"),
				],
				omittedReagents: ["Fenolftaleína"],
			},
		}),
	]);
	// No request kept Fenolftaleína, so no snapshot holds its quantity.
	assert.deepEqual(exercise.reagents, [
		{ reagent: "NaOH 0.1 M", quantity: 50, unit: "mL" },
		{ reagent: "HCl 0.1 M", quantity: 25, unit: "mL" },
		{ reagent: "Fenolftaleína", quantity: null, unit: null },
	]);
});
