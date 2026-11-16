import { useId } from "react";
import { Checkbox } from "#/components/ui/checkbox.tsx";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "#/components/ui/field.tsx";
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
				<FieldLabel
					className="cursor-pointer rounded-lg bg-card has-data-checked:bg-accent has-data-checked:ring-1 has-data-checked:ring-primary has-data-disabled:cursor-not-allowed has-data-disabled:opacity-60 [&>*]:data-[slot=field]:px-3.5 [&>*]:data-[slot=field]:py-3"
					key={role}
				>
					<Field className="gap-3.5" orientation="horizontal">
						<Checkbox
							aria-describedby={`${id}-${role}-description`}
							aria-labelledby={`${id}-${role}-label`}
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
						<FieldContent className="gap-0">
							<FieldTitle
								className="text-base font-bold"
								id={`${id}-${role}-label`}
							>
								{roleLabels[role]}
							</FieldTitle>
							<FieldDescription
								className="text-sm"
								id={`${id}-${role}-description`}
							>
								{roleDescriptions[role]}
							</FieldDescription>
						</FieldContent>
					</Field>
				</FieldLabel>
			))}
		</FieldSet>
	);
}
