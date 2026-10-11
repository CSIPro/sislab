import type { ReactNode } from "react";
import { ScrollArea, ScrollBar } from "#/components/ui/scroll-area.tsx";
import { cn } from "#/lib/utils.ts";

/** The outlined card around a data table. Wide tables scroll sideways inside it. */
export function TableShell({
	className,
	children,
}: {
	className?: string;
	children: ReactNode;
}) {
	return (
		<ScrollArea className={cn("table-shell", className)}>
			{children}
			<ScrollBar orientation="horizontal" />
		</ScrollArea>
	);
}
