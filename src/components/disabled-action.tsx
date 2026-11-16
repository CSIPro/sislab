import type { ReactNode } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip.tsx";

/**
 * Explains why an action is unavailable. A disabled button takes no hover or
 * focus, so the tooltip hangs on a focusable wrapper around it. Pass the
 * disabled button as `children`, with `pointer-events-none` so the wrapper
 * receives the hover.
 */
export function DisabledAction({
	reason,
	children,
}: {
	reason: ReactNode;
	children: ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				// biome-ignore lint/a11y/noNoninteractiveTabindex: the wrapper takes focus so the reason opens from the keyboard
				render={<span className="inline-flex rounded-lg" tabIndex={0} />}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent>{reason}</TooltipContent>
		</Tooltip>
	);
}
