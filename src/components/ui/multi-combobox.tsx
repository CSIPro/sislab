import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import type { ComboboxOption } from "#/components/ui/combobox.tsx";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "#/components/ui/command.tsx";
import { PickerTrigger } from "#/components/ui/picker-trigger.tsx";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover.tsx";
import { ScrollArea } from "#/components/ui/scroll-area.tsx";
import { searchable } from "#/lib/search.ts";
import { cn } from "#/lib/utils.ts";

/** What the trigger says: the chosen labels when there are few, else a count. */
function summary(
	options: ComboboxOption[],
	values: string[],
	placeholder: string,
): string {
	const labels = options
		.filter((option) => values.includes(option.value))
		.map((option) => option.label);
	if (labels.length === 0) return placeholder;
	if (labels.length <= 2) return labels.join(", ");
	return `${labels.length} seleccionados`;
}

/** A Combobox that keeps its list open while the person ticks several options. */
function MultiCombobox({
	options,
	values,
	onValuesChange,
	placeholder = "Elige opciones",
	searchPlaceholder = "Buscar…",
	emptyText = "Sin resultados.",
	search = true,
	...props
}: Omit<
	React.ComponentProps<typeof PickerTrigger>,
	"value" | "defaultValue" | "onChange"
> & {
	options: ComboboxOption[];
	values: string[];
	onValuesChange: (values: string[]) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	/** False hides the search box, for a short fixed list. */
	search?: boolean;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<PickerTrigger
					data-placeholder={values.length === 0 ? "" : undefined}
					data-slot="combobox-trigger"
					role="combobox"
					{...props}
				>
					<span className="truncate">
						{summary(options, values, placeholder)}
					</span>
					<ChevronsUpDownIcon
						aria-hidden="true"
						className="size-4 opacity-50"
					/>
				</PickerTrigger>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-(--radix-popover-trigger-width) min-w-56 rounded-lg p-0"
			>
				<Command
					filter={(_value, query, keywords) =>
						searchable(keywords?.join(" ") ?? "").includes(searchable(query))
							? 1
							: 0
					}
				>
					{search && <CommandInput placeholder={searchPlaceholder} />}
					<CommandList className="max-h-none overflow-visible">
						<CommandEmpty>{emptyText}</CommandEmpty>
						<ScrollArea className="[&>[data-slot=scroll-area-viewport]]:max-h-[300px]">
							<CommandGroup>
								{options.map((option) => {
									const selected = values.includes(option.value);
									return (
										<CommandItem
											keywords={[option.label]}
											key={option.value}
											onSelect={() =>
												onValuesChange(
													selected
														? values.filter((value) => value !== option.value)
														: [...values, option.value],
												)
											}
											value={option.value}
										>
											<span className="flex-1">{option.label}</span>
											{selected && (
												<span className="sr-only">, seleccionado</span>
											)}
											<CheckIcon
												aria-hidden="true"
												className={cn(selected ? "opacity-100" : "opacity-0")}
											/>
										</CommandItem>
									);
								})}
							</CommandGroup>
						</ScrollArea>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export { MultiCombobox };
