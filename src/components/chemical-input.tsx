import { type ComponentProps, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	applyNotationMarks,
	suggestNotation,
} from "#/lib/chemical-notation.ts";
import { cn } from "#/lib/utils.ts";

/**
 * A text field for a name that may hold formulas. "H_2O" becomes "H₂O" and
 * "Fe^3+" becomes "Fe³⁺" as the person types or pastes. When they leave the
 * field with plain digits in a formula, such as "H2SO4", a line under it
 * offers the corrected name. `className` places the field and that line.
 */
export function ChemicalInput({
	value,
	onValueChange,
	className,
	...props
}: Omit<
	ComponentProps<typeof Input>,
	"value" | "onChange" | "onBlur" | "type"
> & {
	value: string;
	onValueChange: (value: string) => void;
}) {
	const [blurred, setBlurred] = useState(false);
	const [declined, setDeclined] = useState<string | null>(null);
	const suggestion =
		blurred && value !== declined ? suggestNotation(value) : null;

	return (
		<div className={cn("flex min-w-0 flex-col", className)}>
			<Input
				{...props}
				onBlur={() => {
					// The line below moves what follows the field. Showing it during the
					// click that took the focus would move that click's target away.
					const show = () => {
						window.removeEventListener("click", show);
						window.removeEventListener("keyup", show);
						setBlurred(true);
					};
					window.addEventListener("click", show);
					window.addEventListener("keyup", show);
				}}
				onChange={(event) => {
					const input = event.target;
					const typedAt = input.selectionStart ?? input.value.length;
					const converted = applyNotationMarks(input.value, typedAt);
					if (converted !== input.value) {
						// A mark is shorter once converted, so the cursor moves back with it.
						const cursor = applyNotationMarks(
							input.value.slice(0, typedAt),
							typedAt,
						).length;
						input.value = converted;
						input.setSelectionRange(cursor, cursor);
					}
					setBlurred(false);
					onValueChange(converted);
				}}
				value={value}
			/>
			{suggestion && (
				<output className="flex flex-col pt-1.5 text-[13.5px] text-muted-foreground">
					<span>
						¿Quisiste decir{" "}
						<span className="font-bold text-foreground">{suggestion}</span>?
					</span>
					<span className="flex gap-3">
						<Button
							aria-label={`Usar ${suggestion}`}
							onClick={() => onValueChange(suggestion)}
							size="inline"
							variant="link"
						>
							Usar
						</Button>
						<Button
							aria-label={`Descartar la sugerencia ${suggestion}`}
							className="font-normal text-muted-foreground"
							onClick={() => setDeclined(value)}
							size="inline"
							variant="link"
						>
							Descartar
						</Button>
					</span>
				</output>
			)}
		</div>
	);
}
