import type * as React from "react";
import { Input } from "#/components/ui/input.tsx";
import { cn } from "#/lib/utils.ts";

/** shadcn has no clock component: its time picker is the Input in time mode. */
function TimePicker({
	className,
	...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
	return (
		<Input
			className={cn("shadow-none", className)}
			data-slot="time-picker"
			type="time"
			{...props}
		/>
	);
}

export { TimePicker };
