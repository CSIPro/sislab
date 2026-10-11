import type { ReactNode } from "react";
import { Checkbox } from "#/components/ui/checkbox.tsx";
import { FieldLegend, FieldSet } from "#/components/ui/field.tsx";
import { Label } from "#/components/ui/label.tsx";
import { allRoles, roleLabels } from "#/lib/user-roles.ts";
import type { UserRole } from "#/server/user-access.ts";

/** One checkbox per role, under the legend "Roles". */
export function RoleCheckboxes({
	roles,
	onChange,
	disabled,
	children,
}: {
	roles: UserRole[];
	onChange: (roles: UserRole[]) => void;
	disabled?: boolean;
	/** A hint shown under the checkboxes. */
	children?: ReactNode;
}) {
	return (
		<FieldSet className="gap-0" disabled={disabled}>
			<FieldLegend variant="label">Roles</FieldLegend>
			{allRoles.map((role) => (
				<Label
					className="min-h-11 cursor-pointer gap-3 text-[15px] font-normal"
					key={role}
				>
					<Checkbox
						checked={roles.includes(role)}
						disabled={disabled}
						onCheckedChange={(checked) =>
							onChange(
								checked === true
									? [...roles, role]
									: roles.filter((entry) => entry !== role),
							)
						}
					/>
					{roleLabels[role]}
				</Label>
			))}
			{children}
		</FieldSet>
	);
}
