/** Lowercases and strips accents so "quimica" finds "Química". */
export function searchable(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLocaleLowerCase("es-MX");
}
