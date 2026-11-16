import type * as React from "react";
import { cn } from "#/lib/utils.ts";

function Label({ className, ...props }: React.ComponentProps<"label">) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: callers pass htmlFor or wrap the control.
		<label
			className={cn(
				"flex items-center gap-2 text-sm font-bold group-data-[disabled=true]:opacity-60 peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
				className,
			)}
			data-slot="label"
			{...props}
		/>
	);
}

export { Label };
