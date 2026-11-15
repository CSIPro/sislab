import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "#/lib/utils.ts";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
	return (
		<CheckboxPrimitive.Root
			className={cn(
				"peer size-5 shrink-0 cursor-pointer rounded-sm border border-muted-foreground bg-card data-checked:border-primary-strong data-checked:bg-primary-strong data-checked:text-white data-disabled:cursor-not-allowed data-disabled:opacity-60",
				className,
			)}
			data-slot="checkbox"
			{...props}
		>
			<CheckboxPrimitive.Indicator
				className="grid place-content-center text-current"
				data-slot="checkbox-indicator"
			>
				<CheckIcon className="size-4" strokeWidth={3} />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
