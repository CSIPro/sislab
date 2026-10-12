import type { FormEvent, ReactNode } from "react";
import { ActionNotice, type NoticeState } from "#/components/notice.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import { ScrollArea } from "#/components/ui/scroll-area.tsx";
import { cn } from "#/lib/utils.ts";

/**
 * A form that adds or edits one item, opened over the page. Render it only while
 * the form is open. The fields scroll when they are taller than the screen, and
 * the title and the buttons stay in view.
 */
export function FormDialog({
	title,
	description,
	notice = null,
	submitLabel,
	busy,
	onSubmit,
	onClose,
	className,
	children,
}: {
	title: string;
	description?: ReactNode;
	/** Shown above the fields. Use it for the error of a failed save. */
	notice?: NoticeState;
	submitLabel: string;
	busy: boolean;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onClose: () => void;
	/** Sizes the dialog, for example `sm:max-w-2xl` for a long form. */
	className?: string;
	children: ReactNode;
}) {
	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open && !busy) onClose();
			}}
			open
		>
			<DialogContent
				className={cn("gap-0 p-0", className)}
				// Radix warns about a missing description unless the attribute is cleared.
				{...(description ? {} : { "aria-describedby": undefined })}
			>
				<form
					className="flex max-h-[calc(100dvh-2rem)] flex-col"
					onSubmit={onSubmit}
				>
					<DialogHeader className="p-6 pr-12 pb-4">
						<DialogTitle className="text-xl leading-tight font-bold">
							{title}
						</DialogTitle>
						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}
					</DialogHeader>
					<ScrollArea className="flex min-h-0 flex-col">
						<div className="flex flex-col gap-[18px] px-6 pt-1 pb-6">
							<ActionNotice notice={notice} />
							{children}
						</div>
					</ScrollArea>
					<DialogFooter className="gap-3 border-t px-6 py-4">
						<Button
							disabled={busy}
							onClick={onClose}
							size="lg"
							variant="outline"
						>
							Cancelar
						</Button>
						<Button disabled={busy} size="lg" type="submit">
							{submitLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
