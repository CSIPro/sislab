import type * as React from "react";
import { ScrollArea, ScrollBar } from "#/components/ui/scroll-area.tsx";
import { cn } from "#/lib/utils.ts";

/** The table sits in an outlined card and scrolls sideways when it is wider than the page. */
function Table({
	className,
	containerClassName,
	...props
}: React.ComponentProps<"table"> & { containerClassName?: string }) {
	return (
		<ScrollArea
			className={cn(
				"min-w-0 overflow-hidden rounded-t-xl rounded-b-lg border bg-card",
				containerClassName,
			)}
			data-slot="table-container"
		>
			<table
				className={cn("w-full border-collapse", className)}
				data-slot="table"
				{...props}
			/>
			<ScrollBar orientation="horizontal" />
		</ScrollArea>
	);
}

function TableHeader(props: React.ComponentProps<"thead">) {
	return <thead data-slot="table-header" {...props} />;
}

function TableBody(props: React.ComponentProps<"tbody">) {
	return <tbody data-slot="table-body" {...props} />;
}

/** A row with an `onClick` shows a pointer and a hover tint, so the whole row selects. */
function TableRow({
	className,
	onClick,
	...props
}: React.ComponentProps<"tr">) {
	return (
		<tr
			className={cn(
				"data-[muted=true]:text-muted-foreground data-[state=selected]:bg-selected-surface",
				onClick &&
					"cursor-pointer not-data-[state=selected]:hover:bg-secondary",
				className,
			)}
			onClick={onClick}
			data-slot="table-row"
			{...props}
		/>
	);
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
	return (
		<th
			className={cn(
				"bg-secondary px-4 py-3 text-left text-[13px] font-bold whitespace-nowrap text-muted-foreground",
				className,
			)}
			data-slot="table-head"
			scope="col"
			{...props}
		/>
	);
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
	return (
		<td
			className={cn(
				"border-t px-4 py-2.5 align-middle font-mono text-[13px] [overflow-wrap:normal] first:whitespace-nowrap",
				className,
			)}
			data-slot="table-cell"
			{...props}
		/>
	);
}

/** A second line inside a cell, such as the time under a date. */
function TableCellNote({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			className={cn("block text-[13px] text-muted-foreground", className)}
			data-slot="table-cell-note"
			{...props}
		/>
	);
}

/** One full-width row that says the table has nothing to show. */
function TableEmpty({
	className,
	colSpan,
	...props
}: React.ComponentProps<"td">) {
	return (
		<tr data-slot="table-empty">
			<td
				className={cn(
					"border-t p-8 text-center text-muted-foreground",
					className,
				)}
				colSpan={colSpan}
				{...props}
			/>
		</tr>
	);
}

export {
	Table,
	TableBody,
	TableCell,
	TableCellNote,
	TableEmpty,
	TableHead,
	TableHeader,
	TableRow,
};
