import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/** Shared by every control that looks like a text field, including the picker triggers. */
const inputVariants = cva(
	"w-full min-w-0 rounded-lg border font-normal text-foreground placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive",
	{
		variants: {
			variant: {
				outline: "min-h-11 bg-card px-3.5 text-[15px]",
				filled: "min-h-12 border-transparent bg-secondary px-3.5 text-base",
			},
		},
		defaultVariants: { variant: "outline" },
	},
);

function Input({
	className,
	variant,
	type,
	...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
	return (
		<input
			className={cn(inputVariants({ variant }), className)}
			data-slot="input"
			type={type}
			{...props}
		/>
	);
}

export { Input, inputVariants };
