const subscripts = "₀₁₂₃₄₅₆₇₈₉";
const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹";

const toSubscript = (digits: string): string =>
	digits.replace(/\d/g, (digit) => subscripts[Number(digit)]);

/** A charge such as "3+" or "-" in superscript characters. */
const toSuperscript = (charge: string): string =>
	charge.replace(/[\d+-]/g, (character) => {
		if (character === "+") return "⁺";
		if (character === "-") return "⁻";
		return superscripts[Number(character)];
	});

/** A period or asterisk between the end of a formula and its water, as in "CuSO₄.5H₂O". */
const hydrateSeparator = /(?<=[₀-₉)]|[A-Z][a-z]?)[.*](?=\d*H₂O)/g;

/**
 * Converts the marks a person types for chemical notation: "H_2O" becomes
 * "H₂O" and "Fe^3+" becomes "Fe³⁺". A period or asterisk before a hydrate's
 * water becomes "·". Plain digits such as "H2SO4" stay as they are.
 *
 * It runs on every keystroke. `cursor` is where the person just typed, and
 * the character before it joins a subscript or charge it follows, so "C_12"
 * and "Fe^3+" convert one key at a time. Without it, as for pasted text, only
 * the marks convert.
 */
export function applyNotationMarks(text: string, cursor?: number): string {
	return joinTypedCharacter(text, cursor)
		.replace(/_(\d+)/g, (_mark, digits: string) => toSubscript(digits))
		.replace(/\^([+-]?\d+[+-]?|[+-])/g, (_mark, charge: string) =>
			toSuperscript(charge),
		)
		.replace(hydrateSeparator, "·");
}

function joinTypedCharacter(text: string, cursor?: number): string {
	if (cursor === undefined || cursor < 2) return text;
	const typed = text[cursor - 1];
	const before = text[cursor - 2];
	const replace = (character: string) =>
		text.slice(0, cursor - 1) + character + text.slice(cursor);
	if (/\d/.test(typed) && /[₀-₉]/.test(before))
		return replace(toSubscript(typed));
	const afterDigit = /[⁰¹²³⁴-⁹]/.test(before);
	if (/\d/.test(typed) && (afterDigit || /[⁺⁻]/.test(before)))
		return replace(toSuperscript(typed));
	if (/[+-]/.test(typed) && afterDigit) return replace(toSuperscript(typed));
	return text;
}

/**
 * The name with its formulas written properly, or null when it already is.
 * Digits right after an element symbol or ")" are taken for a subscript, so
 * "H2SO4" suggests "H₂SO₄" while "HCl 3M" and "KI 5%" suggest nothing. It
 * leaves a charge typed as "Fe3+" alone, because it cannot tell the charge
 * from a count of atoms.
 */
export function suggestNotation(text: string): string | null {
	const suggestion = text
		.replace(/(?<=[A-Z][a-z]?|\))\d+(?!\d)(?![+-](?:[\s)]|$))/g, toSubscript)
		.replace(hydrateSeparator, "·");
	return suggestion === text ? null : suggestion;
}
