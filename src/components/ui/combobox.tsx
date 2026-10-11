import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import * as React from "react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "#/components/ui/command.tsx";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover.tsx";
import { ScrollArea } from "#/components/ui/scroll-area.tsx";
import { searchable } from "#/lib/search.ts";
import { cn } from "#/lib/utils.ts";

export type ComboboxOption = { value: string; label: string };

function Combobox({
	options,
	value: controlledValue,
	defaultValue = "",
	onValueChange,
	name,
	placeholder = "Elige una opción",
	searchPlaceholder = "Buscar…",
	emptyText = "Sin resultados.",
	className,
	...props
}: Omit<
	React.ComponentProps<"button">,
	"value" | "defaultValue" | "onChange"
> & {
	options: ComboboxOption[];
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Submits the chosen value with the surrounding form. */
	name?: string;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
}) {
	const [open, setOpen] = React.useState(false);
	const [ownValue, setOwnValue] = React.useState(defaultValue);
	const value = controlledValue ?? ownValue;
	const selected = options.find((option) => option.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					aria-expanded={open}
					className={cn("picker-trigger", className)}
					data-placeholder={selected ? undefined : ""}
					data-slot="combobox-trigger"
					role="combobox"
					type="button"
					{...props}
				>
					<span className="truncate">{selected?.label ?? placeholder}</span>
					<ChevronsUpDownIcon
						aria-hidden="true"
						className="size-4 opacity-50"
					/>
				</button>
			</PopoverTrigger>
			{name && <input name={name} type="hidden" value={value} />}
			<PopoverContent
				align="start"
				className="w-(--radix-popover-trigger-width) min-w-56 rounded-lg p-0"
			>
				<Command
					filter={(_value, search, keywords) =>
						searchable(keywords?.join(" ") ?? "").includes(searchable(search))
							? 1
							: 0
					}
				>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList className="max-h-none overflow-visible">
						<CommandEmpty>{emptyText}</CommandEmpty>
						<ScrollArea className="[&>[data-slot=scroll-area-viewport]]:max-h-[300px]">
							<CommandGroup>
								{options.map((option) => (
									<CommandItem
										key={option.value}
										keywords={[option.label]}
										onSelect={() => {
											setOwnValue(option.value);
											onValueChange?.(option.value);
											setOpen(false);
										}}
										value={option.value}
									>
										<span className="flex-1">{option.label}</span>
										<CheckIcon
											aria-hidden="true"
											className={cn(
												option.value === value ? "opacity-100" : "opacity-0",
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
						</ScrollArea>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export { Combobox };
