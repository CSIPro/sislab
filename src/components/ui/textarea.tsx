import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { inputVariants } from "#/components/ui/input.tsx";
import { cn } from "#/lib/utils.ts";

function Textarea({
	className,
	variant = "filled",
	...props
}: React.ComponentProps<"textarea"> & VariantProps<typeof inputVariants>) {
	return (
		<textarea
			className={cn(
				inputVariants({ variant }),
				"min-h-24 resize-y py-3",
				className,
			)}
			data-slot="textarea"
			{...props}
		/>
	);
}

export { Textarea };
