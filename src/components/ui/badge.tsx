import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/** The word carries the status. Colour only supports it. */
const badgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center gap-1.5 rounded-sm font-sans font-bold whitespace-nowrap",
	{
		variants: {
			variant: {
				success:
					"bg-success-surface px-2.5 py-[3px] text-[13px] text-success-text",
				warning:
					"bg-warning px-2.5 py-[3px] text-[13px] text-warning-foreground",
				destructive:
					"bg-destructive-surface px-2.5 py-[3px] text-[13px] text-destructive-text",
				neutral: "bg-off-surface px-2.5 py-[3px] text-[13px] text-off-text",
				info: "bg-info-surface px-2.5 py-[3px] text-[13px] text-info-text",
				outline: "border bg-card px-[9px] py-0.5 text-[12.5px] text-foreground",
				muted: "bg-secondary px-2 py-0.5 text-[12.5px] text-muted-foreground",
				// A round counter beside a label that says what is being counted.
				count:
					"h-[22px] min-w-[22px] justify-center rounded-full bg-warning px-[7px] text-[12.5px] text-warning-foreground",
			},
		},
		defaultVariants: { variant: "neutral" },
	},
);

function Badge({
	className,
	variant,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return (
		<span
			className={cn(badgeVariants({ variant }), className)}
			data-slot="badge"
			data-variant={variant}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
