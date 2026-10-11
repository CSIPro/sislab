import { Label as LabelPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

function Label({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
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
