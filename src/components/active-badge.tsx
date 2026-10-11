import { Badge } from "#/components/ui/badge.tsx";

/** "Activa" in green or "Inactiva" in grey. The labels change with the noun's gender. */
export function ActiveBadge({
	active,
	labels = ["Activa", "Inactiva"],
}: {
	active: boolean;
	labels?: readonly [active: string, inactive: string];
}) {
	return (
		<Badge variant={active ? "success" : "neutral"}>
			{active ? labels[0] : labels[1]}
		</Badge>
	);
}
