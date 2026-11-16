import { FormDialog } from "#/components/form-dialog.tsx";
import {
	type GroupFieldOptions,
	GroupFields,
	type GroupFieldValues,
	readGroupFields,
} from "#/components/group-fields.tsx";
import type { FailureState } from "#/components/notice.tsx";
import { groupLabel } from "#/lib/session-dates.ts";

export type GroupInput = Omit<ReturnType<typeof readGroupFields>, "number"> & {
	number: number;
};

/**
 * Edits one existing group in a dialog. The page decides how to save: it gets the
 * fields the person submitted, and passes a failed save back through `failure`.
 */
export function GroupEditDialog({
	group,
	options,
	busy,
	failure,
	onSave,
	onClose,
}: {
	group: GroupFieldValues & { id: string };
	options: GroupFieldOptions;
	busy: boolean;
	failure: FailureState;
	onSave: (input: GroupInput) => void;
	onClose: () => void;
}) {
	return (
		<FormDialog
			busy={busy}
			className="sm:max-w-2xl"
			description={`${group.subjectName} · ${groupLabel(group.number)}`}
			failure={failure}
			onClose={onClose}
			onSubmit={(event) => {
				event.preventDefault();
				const fields = readGroupFields(new FormData(event.currentTarget));
				onSave({ ...fields, number: fields.number ?? group.number });
			}}
			submitLabel={busy ? "Guardando…" : "Guardar cambios"}
			title="Editar grupo"
		>
			<div className="grid gap-3.5 md:grid-cols-2">
				<GroupFields
					group={group}
					idPrefix={`group-${group.id}`}
					options={options}
				/>
			</div>
		</FormDialog>
	);
}
