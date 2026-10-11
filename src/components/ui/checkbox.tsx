import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			className={cn(
				"peer size-5 shrink-0 cursor-pointer rounded-sm border border-muted-foreground bg-card disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-primary-strong data-[state=checked]:bg-primary-strong data-[state=checked]:text-white",
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
