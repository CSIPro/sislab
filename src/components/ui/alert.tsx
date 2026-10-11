import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

const alertVariants = cva(
	"flex w-full items-start gap-3 rounded-lg px-[18px] py-3.5 text-[14.5px] [&>svg]:mt-px [&>svg]:size-5 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-accent text-foreground [&>svg]:text-primary-text",
				warning:
					"border border-warning-border bg-warning-surface text-foreground",
				destructive: "bg-destructive-surface font-bold text-destructive-text",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

function Alert({
	className,
	variant,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
	return (
		<div
			className={cn(alertVariants({ variant }), className)}
			data-slot="alert"
			role="alert"
			{...props}
		/>
	);
}

function AlertTitle({ className, ...props }: React.ComponentProps<"strong">) {
	return (
		<strong
			className={cn("font-bold", className)}
			data-slot="alert-title"
			{...props}
		/>
	);
}

function AlertDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			className={cn("min-w-0 flex-1", className)}
			data-slot="alert-description"
			{...props}
		/>
	);
}

export { Alert, AlertDescription, AlertTitle };
