import type { ReactNode } from "react";
import { cn } from "#/lib/utils.ts";

/** Label and value pairs, such as the fields of a group or a request. */
export function DescriptionList({
	columns = 1,
	children,
}: {
	columns?: 1 | 2;
	children: ReactNode;
}) {
	return (
		<dl
			className={cn(
				"grid gap-3",
				columns === 2 && "grid-cols-2 gap-x-5 gap-y-3.5",
			)}
		>
			{children}
		</dl>
	);
}

export function DescriptionItem({
	term,
	emphasis = false,
	children,
}: {
	term: string;
	/** Marks the value the rest of the list depends on. */
	emphasis?: boolean;
	children: ReactNode;
}) {
	return (
		<div>
			<dt className="text-[13px] text-muted-foreground">{term}</dt>
			<dd
				className={cn(
					"text-[15px] font-medium",
					emphasis && "font-bold text-primary-text",
				)}
			>
				{children}
			</dd>
		</div>
	);
}
