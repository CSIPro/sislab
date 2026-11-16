import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "#/lib/utils.ts";

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
	return (
		<RadioGroupPrimitive
			className={cn("grid gap-3.5", className)}
			data-slot="radio-group"
			{...props}
		/>
	);
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
	return (
		<RadioPrimitive.Root
			className={cn(
				"grid size-5 shrink-0 cursor-pointer place-content-center rounded-full border border-muted-foreground bg-card data-checked:border-primary-strong data-disabled:cursor-not-allowed data-disabled:opacity-60",
				className,
			)}
			data-slot="radio-group-item"
			{...props}
		>
			<RadioPrimitive.Indicator
				className="size-2.5 rounded-full bg-primary-strong"
				data-slot="radio-group-indicator"
			/>
		</RadioPrimitive.Root>
	);
}

export { RadioGroup, RadioGroupItem };
