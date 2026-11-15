import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "#/components/ui/alert.tsx";

/** What a screen keeps in state after a failed action: the message, or null. A success is a toast and never sits in state. */
export type FailureState = string | null;

const tones = {
	success: "default",
	warning: "warning",
	error: "destructive",
} as const;

/** A message about what just happened. Errors interrupt screen readers; the rest wait their turn. */
export function Notice({
	tone = "success",
	icon: Icon,
	children,
}: {
	tone?: keyof typeof tones;
	icon?: LucideIcon;
	children: ReactNode;
}) {
	return (
		<Alert
			aria-live={tone === "error" ? undefined : "polite"}
			role={tone === "error" ? "alert" : "status"}
			variant={tones[tone]}
		>
			{Icon && <Icon aria-hidden="true" strokeWidth={2} />}
			<AlertDescription>{children}</AlertDescription>
		</Alert>
	);
}

/** Renders the failure a screen holds in state, or nothing. */
export function ActionNotice({ failure }: { failure: FailureState }) {
	if (!failure) return null;
	return <Notice tone="error">{failure}</Notice>;
}
