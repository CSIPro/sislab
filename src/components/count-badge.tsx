import { Badge } from "#/components/ui/badge.tsx";

/** What a `CountBadge` counts, in singular and plural, such as "pendiente" and "pendientes". */
export type CountLabels = readonly [one: string, many: string];

/** A round counter on a link or tab. Screen readers hear the number with its label. */
export function CountBadge({
	count,
	labels,
	className,
}: {
	count: number;
	labels: CountLabels;
	className?: string;
}) {
	return (
		<Badge className={className} variant="count">
			<span aria-hidden="true">{count}</span>
			<span className="sr-only">
				, {count} {count === 1 ? labels[0] : labels[1]}
			</span>
		</Badge>
	);
}
