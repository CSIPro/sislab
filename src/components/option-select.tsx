import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { cn } from "#/lib/utils.ts";

/** A shadcn Select for a fixed list of options. Lists that come from data use the Combobox. */
export function OptionSelect({
	options,
	value,
	defaultValue,
	onValueChange,
	name,
	id,
	className,
	"aria-label": ariaLabel,
}: {
	options: ReadonlyArray<readonly [value: string, label: string]>;
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	name?: string;
	id?: string;
	className?: string;
	"aria-label"?: string;
}) {
	return (
		<Select
			defaultValue={defaultValue}
			name={name}
			onValueChange={onValueChange}
			value={value}
		>
			<SelectTrigger
				aria-label={ariaLabel}
				className={cn("field-outline shadow-none", className)}
				id={id}
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent position="popper">
				<SelectGroup>
					{options.map(([optionValue, label]) => (
						<SelectItem key={optionValue} value={optionValue}>
							{label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
