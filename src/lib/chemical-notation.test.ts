import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { applyNotationMarks, suggestNotation } from "./chemical-notation.ts";
import { legacyExercises } from "./legacy-seed.ts";

test("turns the digits after an underscore into a subscript", () => {
	assert.equal(applyNotationMarks("H_2SO_4"), "H₂SO₄");
	assert.equal(applyNotationMarks("C_12H_22O_11"), "C₁₂H₂₂O₁₁");
});

test("keeps extending a subscript as the person types more digits", () => {
	assert.equal(applyNotationMarks("C₁2", 3), "C₁₂");
	assert.equal(applyNotationMarks("C₁2H₂₂", 3), "C₁₂H₂₂");
	assert.equal(applyNotationMarks("C₁₂H_2", 6), "C₁₂H₂");
});

test("leaves an underscore alone until a digit follows it", () => {
	assert.equal(applyNotationMarks("H_"), "H_");
	assert.equal(applyNotationMarks("frasco_a"), "frasco_a");
});

test("turns a caret with a charge into a superscript", () => {
	assert.equal(applyNotationMarks("Fe^3+"), "Fe³⁺");
	assert.equal(applyNotationMarks("Cl^-"), "Cl⁻");
	assert.equal(applyNotationMarks("SO_4^2-"), "SO₄²⁻");
	assert.equal(applyNotationMarks("Fe^+3 y 10^-3 M"), "Fe⁺³ y 10⁻³ M");
});

test("keeps extending a charge as the person types it", () => {
	assert.equal(applyNotationMarks("Fe^", 3), "Fe^");
	assert.equal(applyNotationMarks("Fe³+", 4), "Fe³⁺");
	assert.equal(applyNotationMarks("10⁻3", 4), "10⁻³");
});

test("joins only the character the person just typed", () => {
	assert.equal(applyNotationMarks("H₂3M y Fe", 9), "H₂3M y Fe");
	assert.equal(applyNotationMarks("250 cm³-500"), "250 cm³-500");
});

test("writes the hydrate dot between a formula and its water", () => {
	assert.equal(applyNotationMarks("CuSO₄.5H₂O"), "CuSO₄·5H₂O");
	assert.equal(applyNotationMarks("CaCl_2*2H_2O"), "CaCl₂·2H₂O");
	assert.equal(applyNotationMarks("NaCl.H_2O"), "NaCl·H₂O");
});

test("leaves concentrations, ratios and plain words as typed", () => {
	for (const name of [
		"HCl 0.1M",
		"KI 5%",
		"HCl 1:1",
		"Aprox.5M",
		"HCl.5M",
		"Frasco No.2A",
		"NaCl.2H2O",
		"Papel pH",
		"Gotero con H₂SO₄ 3M",
		"H2SO4",
	])
		assert.equal(applyNotationMarks(name), name);
});

test("suggests subscripts for a formula typed with plain digits", () => {
	assert.equal(suggestNotation("H2SO4"), "H₂SO₄");
	assert.equal(suggestNotation("Gotero con Pb(NO3)2"), "Gotero con Pb(NO₃)₂");
});

test("suggests the hydrate dot along with the subscripts", () => {
	assert.equal(suggestNotation("CuSO4.5H2O"), "CuSO₄·5H₂O");
});

test("suggests nothing for concentrations, ratios and plain words", () => {
	for (const name of [
		"HCl 3M",
		"KI 5%",
		"HCl 1:1",
		"paso 3",
		"5 mL",
		"Tubo 13x100",
		"Matraz250mL",
	])
		assert.equal(suggestNotation(name), null);
});

test("suggests nothing for a charge typed with plain digits", () => {
	assert.equal(suggestNotation("Fe3+"), null);
	assert.equal(suggestNotation("SO42- 0.1M"), null);
	assert.equal(suggestNotation("CaSO4-2H2O"), "CaSO₄-2H₂O");
});

test("suggests a change only for the legacy names that lack notation", () => {
	const exercises = legacyExercises(
		JSON.parse(
			readFileSync(
				new URL("../../docs/legacy-data/exercises.json", import.meta.url),
				"utf8",
			),
		),
	);
	const names = exercises.flatMap(({ materials }) => [
		...materials.reagents.map((item) => item.name),
		...materials.waste.flatMap((item) => [
			item.name,
			item.container,
			item.treatment,
		]),
	]);
	const suggested = new Set(
		names.flatMap((name) => (name && suggestNotation(name)) || []),
	);
	// The one legacy reagent saved with plain digits, with its two alternatives.
	assert.deepEqual(
		[...suggested],
		["CuSO₄ + 5H₂O (alternativas: Na₂CO₃-10H₂O₂, CaSO₄-2H₂O)"],
	);
});
