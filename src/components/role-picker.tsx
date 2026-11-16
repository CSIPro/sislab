import { useId } from "react";
import { Checkbox } from "#/components/ui/checkbox.tsx";
import { FieldLegend, FieldSet } from "#/components/ui/field.tsx";
import { Label } from "#/components/ui/label.tsx";
import { allRoles, roleDescriptions, roleLabels } from "#/lib/user-roles.ts";
import type { UserRole } from "#/server/user-access.ts";

/** One selectable card per role, with what the role does, under the legend "Roles". */
export function RolePicker({
	roles,
	onChange,
	disabled,
}: {
	roles: UserRole[];
	onChange: (roles: UserRole[]) => void;
	disabled?: boolean;
}) {
	const id = useId();
	return (
		<FieldSet className="gap-2" disabled={disabled}>
			<FieldLegend variant="label">Roles</FieldLegend>
			{allRoles.map((role) => (
				<Label
					className="cursor-pointer items-start gap-3.5 rounded-lg border bg-card px-3.5 py-3 text-base font-normal has-data-checked:border-primary has-data-checked:bg-accent has-data-checked:shadow-[0_0_0_1px_var(--primary)] has-data-disabled:cursor-not-allowed has-data-disabled:opacity-60"
					key={role}
				>
					<Checkbox
						aria-describedby={`${id}-${role}-description`}
						aria-labelledby={`${id}-${role}-label`}
						checked={roles.includes(role)}
						className="mt-0.5"
						disabled={disabled}
						onCheckedChange={(checked) =>
							onChange(
								checked === true
									? [...roles, role]
									: roles.filter((entry) => entry !== role),
							)
						}
					/>
					<span className="flex min-w-0 flex-1 flex-col">
						<strong id={`${id}-${role}-label`}>{roleLabels[role]}</strong>
						<span
							className="text-sm text-muted-foreground"
							id={`${id}-${role}-description`}
						>
							{roleDescriptions[role]}
						</span>
					</span>
				</Label>
			))}
		</FieldSet>
	);
}
