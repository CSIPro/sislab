export const weekdays = [
	"Domingo",
	"Lunes",
	"Martes",
	"Miércoles",
	"Jueves",
	"Viernes",
	"Sábado",
];

/** The weekdays as options for a select, keyed by their index. */
export const weekdayOptions = weekdays.map(
	(day, index) => [String(index), day] as const,
);
