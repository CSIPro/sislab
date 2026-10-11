import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

const buttonVariants = cva(
	"inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg text-center font-sans font-medium no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground hover:bg-primary-strong hover:text-primary-foreground",
				outline:
					"border bg-card text-foreground hover:bg-muted hover:text-foreground",
				destructive:
					"border bg-card text-destructive-text hover:bg-muted hover:text-destructive-text",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "text-foreground hover:bg-muted hover:text-foreground",
				link: "font-bold text-primary-text hover:text-primary-strong",
				// A selectable card-like button, such as a date. Pair it with aria-pressed.
				choice:
					"flex-col items-start gap-0 border bg-card leading-tight text-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:font-bold aria-pressed:shadow-[0_0_0_1px_var(--primary)]",
			},
			size: {
				default: "min-h-11 px-4 text-[15px]",
				sm: "min-h-11 px-3.5 text-sm font-bold",
				lg: "min-h-12 px-[22px] text-base",
				icon: "size-11",
				// Sits in running text or a tight row, with no side padding to speak of.
				inline: "min-h-11 gap-1.5 px-1 text-[15px]",
			},
		},
		compoundVariants: [
			// Secondary actions keep their compact padding when they stand next to a large primary button.
			{
				variant: ["outline", "destructive", "choice"],
				size: "lg",
				class: "px-4 text-[15px]",
			},
		],
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	type,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			className={cn(buttonVariants({ variant, size, className }))}
			data-size={size}
			data-slot="button"
			data-variant={variant}
			// A button inside a form submits it unless told otherwise.
			type={asChild ? type : (type ?? "button")}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
