import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

function RadioGroup({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
	return (
		<RadioGroupPrimitive.Root
			className={cn("grid gap-3.5", className)}
			data-slot="radio-group"
			{...props}
		/>
	);
}

function RadioGroupItem({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
	return (
		<RadioGroupPrimitive.Item
			className={cn(
				"grid size-5 shrink-0 cursor-pointer place-content-center rounded-full border border-muted-foreground bg-card disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-primary-strong",
				className,
			)}
			data-slot="radio-group-item"
			{...props}
		>
			<RadioGroupPrimitive.Indicator
				className="size-2.5 rounded-full bg-primary-strong"
				data-slot="radio-group-indicator"
			/>
		</RadioGroupPrimitive.Item>
	);
}

export { RadioGroup, RadioGroupItem };
