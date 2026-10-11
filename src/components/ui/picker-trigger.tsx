import type * as React from "react";
import { Button } from "#/components/ui/button.tsx";
import { cn } from "#/lib/utils.ts";

export type FieldVariant = "outline" | "filled";

/** The button that opens a Combobox or DatePicker. It looks like the Input of the same variant. */
function PickerTrigger({
	className,
	fieldVariant = "outline",
	...props
}: React.ComponentProps<typeof Button> & { fieldVariant?: FieldVariant }) {
	return (
		<Button
			className={cn(
				"w-full min-w-0 justify-between px-3.5 text-left font-normal data-[placeholder]:text-muted-foreground",
				fieldVariant === "filled" &&
					"min-h-12 border-transparent bg-secondary text-base hover:bg-secondary",
				className,
			)}
			variant="outline"
			{...props}
		/>
	);
}

export { PickerTrigger };
