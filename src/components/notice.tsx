import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "#/components/ui/alert.tsx";

/** What a screen keeps in state after an action: the message and whether it failed. */
export type NoticeState = { text: string; error: boolean } | null;

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

/** Renders the notice a screen holds in state, or nothing. */
export function ActionNotice({ notice }: { notice: NoticeState }) {
	if (!notice) return null;
	return (
		<Notice tone={notice.error ? "error" : "success"}>{notice.text}</Notice>
	);
}
