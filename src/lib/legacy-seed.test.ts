import assert from "node:assert/strict";
import { test } from "node:test";
import { legacyCatalogs, legacyExercises, legacyText } from "./legacy-seed.ts";

test("decodes legacy subscript entities, including the ones missing their #", () => {
	assert.equal(legacyText("HNO&#8323; 50 %"), "HNO₃ 50 %");
	assert.equal(legacyText("H&822;SO&8324; concentrado"), "H₂SO₄ concentrado");
});

test("reads catalog names from the legacy responses", () => {
	assert.deepEqual(
		legacyCatalogs(
			{ laboratorios: [{ laboratorio: "5N - 204" }] },
			{ carreras: [{ carrera: "Ing. Civil" }] },
			{ materias: [{ materia: "7162 | Química General" }] },
		),
		{
			labs: ["5N - 204"],
			careers: ["Ing. Civil"],
			subjects: ["7162 | Química General"],
		},
	);
});

test("adapts a legacy exercise, leaving missing quantities and waste details empty", () => {
	const [exercise] = legacyExercises({
		assignments: [
			{
				number: "13",
				name: "Agua de hidratación",
				reagents: {
					groups: [
						{
							reagents: [
								{
									reagent: "CuSO4 + 5H2O",
									quantity: 6,
									unit: "g",
									alternatives: [{ reagent: "CaSO4-2H2O" }],
								},
								{ reagent: "Gotero AgNO&#8323; 1 %" },
							],
						},
					],
				},
				equipment: ["Balanza analítica"],
				waste: [
					{ treatment: "Se puede juntar y reutilizar" },
					{
						residue: "HNO&#8323; + Cu",
						container: "Frasco de vidrio",
						treatment: "Colectar y enviar a PISSA",
					},
				],
			},
		],
	});
	assert.deepEqual(exercise, {
		number: "13",
		name: "Agua de hidratación",
		materials: {
			reagents: [
				{
					name: "CuSO4 + 5H2O (alternativas: CaSO4-2H2O)",
					amount: 6,
					unit: "g",
					basis: "team",
				},
				{ name: "Gotero AgNO₃ 1 %", amount: null, unit: null, basis: "team" },
			],
			equipment: [
				{ name: "Balanza analítica", amount: null, unit: null, basis: "team" },
			],
			waste: [
				{
					name: null,
					container: null,
					treatment: "Se puede juntar y reutilizar",
				},
				{
					name: "HNO₃ + Cu",
					container: "Frasco de vidrio",
					treatment: "Colectar y enviar a PISSA",
				},
			],
		},
	});
});
