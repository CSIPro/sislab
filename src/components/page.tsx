import type { ReactNode } from "react";
import { cn } from "#/lib/utils.ts";

const pageSizes = {
	wide: "max-w-[1240px] gap-8",
	compact: "max-w-[1240px] gap-6",
	narrow: "max-w-[1100px] gap-7",
	// Forms stay in a narrow column at the left edge.
	form: "mx-0 max-w-[640px] gap-7",
};

/** The padded column every screen inside the app sits in. */
export function Page({
	size = "wide",
	children,
}: {
	size?: keyof typeof pageSizes;
	children: ReactNode;
}) {
	return (
		<main className="px-10 pt-10 pb-14 max-md:px-4 max-md:pt-7 max-md:pb-10">
			<div className={cn("mx-auto flex flex-col", pageSizes[size])}>
				{children}
			</div>
		</main>
	);
}

/** The page title, its one-line description, and any actions at the right. */
export function PageHeader({
	title,
	description,
	children,
}: {
	title: string;
	description?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<header className="flex flex-wrap items-start justify-between gap-5">
			<div className="flex min-w-0 flex-col gap-1.5">
				<h1 className="text-4xl leading-tight font-bold max-md:text-[28.8px]">
					{title}
				</h1>
				{description && (
					<p className="max-w-[680px] text-pretty text-muted-foreground">
						{description}
					</p>
				)}
			</div>
			{children && (
				<div className="flex flex-wrap items-center gap-3">{children}</div>
			)}
		</header>
	);
}

/** Small print under a page's content. */
export function Footnote({ children }: { children: ReactNode }) {
	return (
		<p className="max-w-[720px] text-sm text-pretty text-muted-foreground">
			{children}
		</p>
	);
}

/** A dashed box that says a list is empty and, usually, what to do about it. */
export function EmptyState({
	id,
	children,
}: {
	id?: string;
	children: ReactNode;
}) {
	return (
		<p
			className="rounded-lg border border-dashed p-5 text-muted-foreground"
			id={id}
		>
			{children}
		</p>
	);
}

/** A pill that shows the current academic period next to the page actions. */
export function PeriodPill({ code }: { code: string }) {
	return (
		<span className="inline-flex min-h-11 items-center rounded-lg border bg-card px-4 text-sm font-bold">
			Período {code}
		</span>
	);
}
