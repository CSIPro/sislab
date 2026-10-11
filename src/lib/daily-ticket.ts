import type { RequestMaterials } from "../db/schema.ts";

/** The fields of a daily ticket request that the ticket prints. */
export type TicketRow = {
	request: {
		id: string;
		exerciseId: string;
		exerciseNumber: string;
		exerciseName: string;
		sessionDate: string;
		startTime: string;
		endTime: string;
		labName: string;
		professorNote: string | null;
		materials: RequestMaterials;
	};
	group: { teams: number };
	professor: { id: string; name: string; surname: string };
};

export type TicketReagent = {
	reagent: string;
	quantity: number | null;
	unit: string | null;
};
export type TicketWaste = {
	residue: string;
	container: string;
	treatment: string;
};
export type TicketGroup = {
	id: string;
	teams: number;
	date: string;
	timeslot: string;
	lab: string;
	comments: string[];
	omittedReagents: string[];
	customReagents: TicketReagent[];
	customEquipment: string[];
	customWaste: TicketWaste[];
};
export type TicketProfessor = {
	id: string;
	name: string;
	requests: TicketGroup[];
};
export type TicketExercise = {
	id: string;
	number: string;
	name: string;
	professors: TicketProfessor[];
	reagents: TicketReagent[];
	equipment: string[];
	waste: TicketWaste[];
};

/**
 * Groups a day's requests the way the legacy ticket does: by lab exercise,
 * then by professor, with one entry per group.
 */
export function buildDailyTicket(rows: TicketRow[]): TicketExercise[] {
	const exercises = new Map<string, TicketExercise>();
	for (const { request, group, professor } of rows) {
		const { materials } = request;
		let exercise = exercises.get(request.exerciseId);
		if (!exercise) {
			exercise = {
				id: request.exerciseId,
				number: request.exerciseNumber,
				name: request.exerciseName,
				professors: [],
				reagents: [],
				equipment: [],
				waste: [],
			};
			exercises.set(exercise.id, exercise);
		}

		// The exercise's own list is the union of its requests' snapshots.
		for (const item of materials.reagents) {
			const listed = exercise.reagents.find(
				(reagent) => reagent.reagent === item.name,
			);
			if (!listed) exercise.reagents.push(toReagent(item));
			else if (listed.quantity === null) Object.assign(listed, toReagent(item));
		}
		for (const name of materials.omittedReagents)
			if (!exercise.reagents.some((reagent) => reagent.reagent === name))
				exercise.reagents.push({ reagent: name, quantity: null, unit: null });
		for (const { name } of materials.equipment)
			if (!exercise.equipment.includes(name)) exercise.equipment.push(name);
		for (const item of materials.waste) {
			const waste = toWaste(item);
			if (
				!exercise.waste.some(
					(listed) =>
						listed.residue === waste.residue &&
						listed.container === waste.container &&
						listed.treatment === waste.treatment,
				)
			)
				exercise.waste.push(waste);
		}

		let entry = exercise.professors.find(({ id }) => id === professor.id);
		if (!entry) {
			entry = {
				id: professor.id,
				name: `${professor.name} ${professor.surname}`,
				requests: [],
			};
			exercise.professors.push(entry);
		}
		entry.requests.push({
			id: request.id,
			teams: group.teams,
			date: formatTicketDate(request.sessionDate),
			timeslot: `${clock(request.startTime)} - ${clock(request.endTime)}`,
			lab: request.labName,
			comments: request.professorNote ? [request.professorNote] : [],
			omittedReagents: materials.omittedReagents,
			customReagents: materials.addedReagents.map(toReagent),
			customEquipment: materials.addedEquipment.map(({ name }) => name),
			customWaste: materials.addedWaste.map(toWaste),
		});
	}
	// Omitted reagents with no quantity go last, after every listed one.
	for (const exercise of exercises.values())
		exercise.reagents.sort(
			(a, b) => Number(a.quantity === null) - Number(b.quantity === null),
		);
	return [...exercises.values()];
}

/** "2026-03-09" as "09/03/2026". */
export function formatTicketDate(date: string): string {
	return date.split("-").reverse().join("/");
}

function toReagent(item: {
	name: string;
	amount: number | null;
	unit: string | null;
}): TicketReagent {
	return { reagent: item.name, quantity: item.amount, unit: item.unit };
}

function toWaste(item: {
	name: string | null;
	container: string | null;
	treatment: string;
}): TicketWaste {
	return {
		residue: item.name ?? "",
		container: item.container ?? "",
		treatment: item.treatment,
	};
}

/** "08:00:00" as "8:00", the way the legacy ticket prints an hour. */
function clock(time: string): string {
	const [hours, minutes] = time.split(":");
	return `${Number(hours)}:${minutes}`;
}
