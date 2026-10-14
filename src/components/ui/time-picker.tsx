import * as React from "react";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";

/**
 * shadcn has no clock component, and a native time input shows AM/PM or 24
 * hours depending on the browser's language. Two selects always show 24 hours.
 * Times cross this component as HH:MM text, or "" while none is chosen.
 */
const pad = (part: number) => String(part).padStart(2, "0");

/** The values from `from` through `to`, plus `keep` so a saved value outside the range still shows. */
function options(from: number, to: number, keep: string) {
	const values = Array.from({ length: to - from + 1 }, (_, index) =>
		pad(from + index),
	);
	return keep && !values.includes(keep) ? [...values, keep].sort() : values;
}

function TimePicker({
	value: controlledValue,
	defaultValue = "",
	onValueChange,
	name,
	id,
	required,
	label,
	earliest = "00:00",
	latest = "23:59",
}: {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Submits the chosen time with the surrounding form. */
	name?: string;
	/** Goes on the hour select, so a `<label htmlFor>` can point at it. */
	id?: string;
	required?: boolean;
	/** What the time is for, as screen readers announce it: "Hora de inicio". */
	label: string;
	/** The first and last times on offer, as HH:MM. A saved time outside them still shows. */
	earliest?: string;
	latest?: string;
}) {
	const [ownValue, setOwnValue] = React.useState(defaultValue);
	const value = (controlledValue ?? ownValue).slice(0, 5);
	const hour = value.slice(0, 2);
	const minute = value.slice(3, 5);
	const [firstHour, firstMinute] = earliest.split(":").map(Number);
	const [lastHour, lastMinute] = latest.split(":").map(Number);
	const hours = options(firstHour, lastHour, hour);
	// Only the first and last hours cut the minutes short.
	const minuteRange = (forHour: string): [number, number] => [
		forHour === pad(firstHour) ? firstMinute : 0,
		forHour === pad(lastHour) ? lastMinute : 59,
	];
	const minutes = options(...minuteRange(hour), minute);

	/** Keeps the minute when the new hour allows it, otherwise takes that hour's first minute. */
	function chooseHour(nextHour: string) {
		const [first, last] = minuteRange(nextHour);
		const fits =
			minute !== "" && Number(minute) >= first && Number(minute) <= last;
		choose(`${nextHour}:${fits ? minute : pad(first)}`);
	}

	function choose(next: string) {
		setOwnValue(next);
		onValueChange?.(next);
	}

	return (
		<div className="flex items-center gap-2" data-slot="time-picker">
			<Select onValueChange={chooseHour} required={required} value={hour}>
				<SelectTrigger
					aria-label={`${label}, hora`}
					className="w-full min-w-0 flex-1"
					id={id}
				>
					<SelectValue placeholder="--" />
				</SelectTrigger>
				<SelectContent className="max-h-64" position="popper">
					<SelectGroup>
						{hours.map((option) => (
							<SelectItem key={option} value={option}>
								{option}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			<span aria-hidden="true" className="font-bold text-muted-foreground">
				:
			</span>
			<Select
				disabled={!hour}
				onValueChange={(next) => choose(`${hour}:${next}`)}
				value={minute}
			>
				<SelectTrigger
					aria-label={`${label}, minutos`}
					className="w-full min-w-0 flex-1"
				>
					<SelectValue placeholder="--" />
				</SelectTrigger>
				<SelectContent className="max-h-64" position="popper">
					<SelectGroup>
						{minutes.map((option) => (
							<SelectItem key={option} value={option}>
								{option}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			{name && <input name={name} type="hidden" value={value} />}
		</div>
	);
}

export { TimePicker };
