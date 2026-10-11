import { CalendarIcon } from "lucide-react";
import * as React from "react";
import { es } from "react-day-picker/locale";
import { Calendar } from "#/components/ui/calendar.tsx";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover.tsx";
import { cn } from "#/lib/utils.ts";

/** Dates cross this component as YYYY-MM-DD text, the format the server stores. */
function toDate(value: string) {
	const [year, month, day] = value.split("-").map(Number);
	return new Date(year, month - 1, day);
}

function toValue(date: Date) {
	const pad = (part: number) => String(part).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const labelFormat = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

function DatePicker({
	value: controlledValue,
	defaultValue = "",
	onValueChange,
	name,
	placeholder = "Elige una fecha",
	isDateDisabled,
	min,
	max,
	clearable = false,
	footer,
	className,
	children,
	"aria-label": ariaLabel,
	...props
}: Omit<
	React.ComponentProps<"button">,
	"value" | "defaultValue" | "onChange"
> & {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Submits the chosen date with the surrounding form. */
	name?: string;
	placeholder?: string;
	/** Receives each date as YYYY-MM-DD and returns true to block it. */
	isDateDisabled?: (value: string) => boolean;
	/** First and last selectable dates, as YYYY-MM-DD. */
	min?: string;
	max?: string;
	/** Lets the person remove the date. Use it for optional dates. */
	clearable?: boolean;
	footer?: React.ReactNode;
	/** Replaces the default trigger content. */
	children?: React.ReactNode;
}) {
	const [open, setOpen] = React.useState(false);
	const [ownValue, setOwnValue] = React.useState(defaultValue);
	const value = controlledValue ?? ownValue;
	const selected = value ? toDate(value) : undefined;

	function choose(next: string) {
		setOwnValue(next);
		onValueChange?.(next);
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					// An aria-label replaces the visible text, so it has to carry the date too.
					aria-label={
						ariaLabel && selected
							? `${ariaLabel}: ${labelFormat.format(selected)}`
							: ariaLabel
					}
					className={cn(!children && "picker-trigger", className)}
					data-placeholder={value ? undefined : ""}
					data-slot="date-picker-trigger"
					type="button"
					{...props}
				>
					{children ?? (
						<>
							<span className="truncate">
								{selected ? labelFormat.format(selected) : placeholder}
							</span>
							<CalendarIcon aria-hidden="true" className="size-4 opacity-50" />
						</>
					)}
				</button>
			</PopoverTrigger>
			{name && <input name={name} type="hidden" value={value} />}
			<PopoverContent align="start" className="w-auto rounded-lg p-0">
				<Calendar
					className="[--cell-size:--spacing(10)]"
					defaultMonth={selected ?? (min ? toDate(min) : undefined)}
					disabled={(date) => {
						const day = toValue(date);
						return (
							(min !== undefined && day < min) ||
							(max !== undefined && day > max) ||
							(isDateDisabled?.(day) ?? false)
						);
					}}
					endMonth={max ? toDate(max) : undefined}
					locale={es}
					mode="single"
					onSelect={(date) => {
						if (date) choose(toValue(date));
					}}
					selected={selected}
					startMonth={min ? toDate(min) : undefined}
				/>
				{(footer || (clearable && value)) && (
					<div className="flex flex-col items-start gap-2 border-t px-4 py-3 text-[13px] text-muted-foreground">
						{footer}
						{clearable && value && (
							<button
								className="button-text"
								onClick={() => choose("")}
								type="button"
							>
								Quitar fecha
							</button>
						)}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}

export { DatePicker };
