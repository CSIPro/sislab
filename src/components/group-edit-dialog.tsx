import { FormDialog } from "#/components/form-dialog.tsx";
import {
	type GroupFieldOptions,
	GroupFields,
	type GroupFieldValues,
	readGroupFields,
} from "#/components/group-fields.tsx";
import type { NoticeState } from "#/components/notice.tsx";
import { groupLabel } from "#/lib/session-dates.ts";

export type GroupInput = Omit<ReturnType<typeof readGroupFields>, "number"> & {
	number: number;
};

/**
 * Edits one existing group in a dialog. The page decides how to save: it gets the
 * fields the person submitted, and passes a failed save back through `notice`.
 */
export function GroupEditDialog({
	group,
	options,
	busy,
	notice,
	onSave,
	onClose,
}: {
	group: GroupFieldValues & { id: string };
	options: GroupFieldOptions;
	busy: boolean;
	notice: NoticeState;
	onSave: (input: GroupInput) => void;
	onClose: () => void;
}) {
	return (
		<FormDialog
			busy={busy}
			className="sm:max-w-2xl"
			description={`${group.subjectName} · ${groupLabel(group.number)}`}
			notice={notice}
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
