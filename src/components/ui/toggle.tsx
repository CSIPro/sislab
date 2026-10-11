"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

const toggleVariants = cva(
	"inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg text-[14.5px] font-medium whitespace-nowrap text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 data-[state=on]:bg-accent data-[state=on]:font-bold [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				outline: "border bg-card data-[state=on]:border-accent-border",
			},
			size: {
				default: "min-h-11 min-w-11 px-4",
				sm: "h-8 min-w-8 px-1.5",
				lg: "h-10 min-w-10 px-2.5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Toggle({
	className,
	variant,
	size,
	...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
	VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive.Root
			data-slot="toggle"
			className={cn(toggleVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Toggle, toggleVariants };
