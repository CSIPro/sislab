import { useState } from "react";
import { OptionSelect } from "#/components/option-select.tsx";
import { Combobox, type ComboboxOption } from "#/components/ui/combobox.tsx";
import { Field, FieldLabel } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { TimePicker } from "#/components/ui/time-picker.tsx";
import { defaultEndTime } from "#/lib/session-dates.ts";
import { weekdayOptions } from "#/lib/weekdays.ts";

type CatalogChoice = { id: string; name: string };

export type GroupFieldOptions = {
	periods: Array<{ code: string }>;
	suggestedCode?: string | null;
	labs: CatalogChoice[];
	careers: CatalogChoice[];
	subjects: CatalogChoice[];
};

/** The saved values of the group being edited. Leave it out when registering a new group. */
export type GroupFieldValues = {
	periodCode: string;
	number: number;
	labId: string;
	labName: string;
	careerId: string;
	careerName: string;
	subjectId: string;
	subjectName: string;
	students: number;
	teams: number;
	weekday: number;
	startTime: string;
	endTime: string;
};

/**
 * A retired catalog entry no longer comes in the list, but a group that uses it
 * must still show it. This puts the group's saved label back in front.
 */
function catalogOptions(
	entries: CatalogChoice[],
	current?: CatalogChoice,
): ComboboxOption[] {
	const options = entries.map(({ id, name }) => ({ value: id, label: name }));
	return current && !entries.some(({ id }) => id === current.id)
		? [
				{ value: current.id, label: `${current.name} (nombre guardado)` },
				...options,
			]
		: options;
}

/**
 * Every field of a group, named for `FormData`. The parent form decides the layout.
 * `idPrefix` keeps the ids unique when a page shows several group forms.
 */
export function GroupFields({
	options,
	group,
	idPrefix,
}: {
	options: GroupFieldOptions;
	group?: GroupFieldValues;
	idPrefix: string;
}) {
	const id = (field: string) => `${idPrefix}-${field}`;
	const [endTime, setEndTime] = useState(group?.endTime.slice(0, 5) ?? "");
	// A new group's end time follows its start time until the person sets their own.
	// Emptying the end time hands it back to the start time.
	const [endTimeFollowsStart, setEndTimeFollowsStart] = useState(!group);
	const periodCodes = options.periods.map(({ code }) => code);
	const catalogs = [
		[
			"labId",
			"Laboratorio",
			"laboratorio",
			options.labs,
			group && { id: group.labId, name: group.labName },
		],
		[
			"careerId",
			"Carrera",
			"carrera",
			options.careers,
			group && { id: group.careerId, name: group.careerName },
		],
		[
			"subjectId",
			"Materia",
			"materia",
			options.subjects,
			group && { id: group.subjectId, name: group.subjectName },
		],
	] as const;

	return (
		<>
			<Field>
				<FieldLabel htmlFor={id("period")}>Período académico</FieldLabel>
				<Combobox
					defaultValue={
						group?.periodCode ?? options.suggestedCode ?? periodCodes[0]
					}
					emptyText="Ningún período coincide."
					id={id("period")}
					name="periodCode"
					options={[
						...(group && !periodCodes.includes(group.periodCode)
							? [group.periodCode]
							: []),
						...periodCodes,
					].map((code) => ({
						value: code,
						label:
							!group && code === options.suggestedCode
								? `${code} (sugerido)`
								: code,
					}))}
					searchPlaceholder="Buscar período"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={id("number")}>
					{group ? "Número de grupo" : "Número de grupo (opcional)"}
				</FieldLabel>
				<Input
					defaultValue={group?.number}
					id={id("number")}
					min="1"
					name="number"
					placeholder={group ? undefined : "Siguiente disponible"}
					required={Boolean(group)}
					step="1"
					type="number"
				/>
			</Field>
			{catalogs.map(([name, label, noun, entries, current]) => (
				<Field key={name}>
					<FieldLabel htmlFor={id(name)}>{label}</FieldLabel>
					<Combobox
						defaultValue={current?.id ?? entries[0]?.id}
						emptyText="Sin resultados."
						id={id(name)}
						name={name}
						options={catalogOptions(entries, current || undefined)}
						searchPlaceholder={`Buscar ${noun}`}
					/>
				</Field>
			))}
			<Field>
				<FieldLabel htmlFor={id("students")}>Estudiantes</FieldLabel>
				<Input
					defaultValue={group?.students ?? 1}
					id={id("students")}
					max="60"
					min="1"
					name="students"
					required
					step="1"
					type="number"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={id("teams")}>Equipos</FieldLabel>
				<Input
					defaultValue={group?.teams ?? 1}
					id={id("teams")}
					min="1"
					name="teams"
					required
					step="1"
					type="number"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={id("weekday")}>Día de la semana</FieldLabel>
				<OptionSelect
					className="w-full"
					defaultValue={String(group?.weekday ?? 0)}
					id={id("weekday")}
					name="weekday"
					options={weekdayOptions}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={id("start")}>Hora de inicio</FieldLabel>
				<TimePicker
					defaultValue={group?.startTime.slice(0, 5)}
					id={id("start")}
					name="startTime"
					onChange={(event) => {
						if (endTimeFollowsStart)
							setEndTime(defaultEndTime(event.target.value) ?? "");
					}}
					required
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={id("end")}>Hora de término</FieldLabel>
				<TimePicker
					id={id("end")}
					name="endTime"
					onChange={(event) => {
						setEndTime(event.target.value);
						setEndTimeFollowsStart(!group && event.target.value === "");
					}}
					required
					value={endTime}
				/>
			</Field>
		</>
	);
}

/** Reads what `GroupFields` submitted. The number is null when the person left it blank. */
export function readGroupFields(form: FormData) {
	const number = String(form.get("number") ?? "").trim();
	return {
		periodCode: String(form.get("periodCode") ?? ""),
		number: number ? Number(number) : null,
		labId: String(form.get("labId") ?? ""),
		careerId: String(form.get("careerId") ?? ""),
		subjectId: String(form.get("subjectId") ?? ""),
		students: Number(form.get("students")),
		teams: Number(form.get("teams")),
		weekday: Number(form.get("weekday")),
		startTime: String(form.get("startTime") ?? ""),
		endTime: String(form.get("endTime") ?? ""),
	};
}
