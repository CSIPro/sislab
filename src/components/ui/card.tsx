import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

function Card({
	className,
	asChild = false,
	...props
}: React.ComponentProps<"section"> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : "section";
	return (
		<Comp
			className={cn(
				"flex min-w-0 flex-col gap-[18px] rounded-lg border bg-card p-6 text-card-foreground max-md:p-[18px]",
				className,
			)}
			data-slot="card"
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-3",
				className,
			)}
			data-slot="card-header"
			{...props}
		/>
	);
}

/** A heading, so screen readers can jump between cards. Pass `as` to change its level. */
function CardTitle({
	className,
	as: Heading = "h2",
	...props
}: React.ComponentProps<"h2"> & { as?: "h2" | "h3" }) {
	return (
		<Heading
			className={cn("text-[22px] font-bold", className)}
			data-slot="card-title"
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			className={cn("text-[14.5px] text-muted-foreground", className)}
			data-slot="card-description"
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-col gap-[18px]", className)}
			data-slot="card-content"
			{...props}
		/>
	);
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-wrap gap-3 border-t pt-5", className)}
			data-slot="card-footer"
			{...props}
		/>
	);
}

export {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
};
