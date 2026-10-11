import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { OptionSelect } from "#/components/option-select.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip.tsx";
import type { QuantityItem, WasteItem } from "#/db/schema.ts";
import { cn } from "#/lib/utils.ts";

/** A reagent or equipment line while the person edits it. Amount and unit stay text until it is saved; empty text means none. */
export type QuantityDraft = Omit<QuantityItem, "amount" | "unit"> & {
	amount: string;
	unit: string;
	key: string;
};
/** A waste line while the person edits it. An empty name or container means none. */
export type WasteDraft = { [Field in keyof WasteItem]: string } & {
	key: string;
};

export const emptyQuantityDraft = (): QuantityDraft => ({
	key: crypto.randomUUID(),
	name: "",
	amount: "",
	unit: "",
	basis: "team",
});

export const emptyWasteDraft = (): WasteDraft => ({
	key: crypto.randomUUID(),
	name: "",
	container: "",
	treatment: "",
});

export const quantityItems = (drafts: QuantityDraft[]): QuantityItem[] =>
	drafts.map(({ key: _key, ...item }) => ({
		...item,
		amount: item.amount.trim() ? Number(item.amount) : null,
		unit: item.unit.trim() || null,
	}));

export const wasteItems = (drafts: WasteDraft[]): WasteItem[] =>
	drafts.map(({ key: _key, ...item }) => ({
		...item,
		name: item.name.trim() || null,
		container: item.container.trim() || null,
	}));

export const quantityDrafts = (items: QuantityItem[]): QuantityDraft[] =>
	items.map((item) => ({
		...item,
		amount: item.amount === null ? "" : String(item.amount),
		unit: item.unit ?? "",
		key: crypto.randomUUID(),
	}));

export const wasteDrafts = (items: WasteItem[]): WasteDraft[] =>
	items.map((item) => ({
		...item,
		name: item.name ?? "",
		container: item.container ?? "",
		key: crypto.randomUUID(),
	}));

/** "Residuo · Contenedor · Tratamiento", without the parts the waste item lacks. */
export const wasteSummary = (item: WasteItem): string =>
	[item.name, item.container, item.treatment].filter(Boolean).join(" · ");

const basisOptions = [
	["team", "Por equipo"],
	["group", "Por grupo"],
] as const;

/**
 * A material's standalone amount. When it is per team, hovering shows the total
 * for the whole group (the amount times the number of teams). Renders nothing
 * for a material without a quantity.
 */
export function QuantityAmount({
	item,
	teams,
}: {
	item: Pick<QuantityItem, "amount" | "unit" | "basis">;
	teams: number;
}) {
	if (item.amount === null) return null;
	const amount = `${item.amount} ${item.unit}`;
	if (item.basis !== "team") return <>{amount}</>;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="cursor-help underline decoration-dotted underline-offset-4">
					{amount}
				</span>
			</TooltipTrigger>
			<TooltipContent>
				Total para todo el grupo: {item.amount} × {teams}{" "}
				{teams === 1 ? "equipo" : "equipos"} = {item.amount * teams} {item.unit}
			</TooltipContent>
		</Tooltip>
	);
}

const struck = "text-muted-foreground line-through decoration-[1.5px]";

/** One line of a material list: a divider above, the name growing, the details at the right. */
export function MaterialRow({
	className,
	children,
}: {
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={cn("flex items-center gap-3 border-t py-2.5", className)}>
			{children}
		</div>
	);
}

/** "50 mL" and "por equipo", struck through when the reagent is omitted. Renders nothing for a material without a quantity. */
export function QuantityDetails({
	item,
	omitted = false,
}: {
	item: QuantityItem;
	omitted?: boolean;
}) {
	if (item.amount === null) return null;
	return (
		<>
			<span
				className={cn("font-mono text-[13px] tabular-nums", omitted && struck)}
			>
				{item.amount} {item.unit}
			</span>
			<Badge className={cn(omitted && "line-through")} variant="muted">
				{item.basis === "team" ? "por equipo" : "por grupo"}
			</Badge>
		</>
	);
}

export function MaterialName({
	omitted = false,
	note,
	children,
}: {
	omitted?: boolean;
	/** A second line, such as a waste item's container and treatment. */
	note?: ReactNode;
	children: ReactNode;
}) {
	return (
		<span className={cn("flex min-w-0 flex-1 flex-col", omitted && struck)}>
			{children}
			{note && (
				<span className="text-[13.5px] text-muted-foreground">{note}</span>
			)}
		</span>
	);
}

/** A read-only list of reagents or equipment under a small heading. */
export function QuantityList({
	title,
	items,
}: {
	title: string;
	items: QuantityItem[];
}) {
	return (
		<div>
			<h3 className="text-[15px] font-bold">{title}</h3>
			{items.length === 0 && (
				<p className="text-[14.5px] text-muted-foreground">Ninguno.</p>
			)}
			{items.map((item) => (
				<MaterialRow
					key={`${item.name}-${item.amount}-${item.unit}-${item.basis}`}
				>
					<MaterialName>{item.name}</MaterialName>
					<QuantityDetails item={item} />
				</MaterialRow>
			))}
		</div>
	);
}

/** A read-only list of expected waste under a small heading. */
export function WasteList({ items }: { items: WasteItem[] }) {
	return (
		<div>
			<h3 className="text-[15px] font-bold">Residuos esperados</h3>
			{items.length === 0 && (
				<p className="text-[14.5px] text-muted-foreground">Ninguno.</p>
			)}
			{items.map((item) => (
				<WasteRow item={item} key={wasteSummary(item)} />
			))}
		</div>
	);
}

/** A waste line: the residue name over its container and treatment, or those alone when it has no name. */
export function WasteRow({ item }: { item: WasteItem }) {
	const details = [item.container, item.treatment].filter(Boolean).join(" · ");
	return (
		<MaterialRow className="items-start">
			{item.name ? (
				<MaterialName note={details}>{item.name}</MaterialName>
			) : (
				<MaterialName>{details}</MaterialName>
			)}
		</MaterialRow>
	);
}

const editorRow =
	"grid grid-cols-[repeat(auto-fit,minmax(min(120px,100%),1fr))] gap-2 border-t py-2.5";

function AddButton({
	onClick,
	children,
}: {
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<div>
			<Button onClick={onClick} size="inline" variant="link">
				<Plus aria-hidden="true" size={16} strokeWidth={2} />
				{children}
			</Button>
		</div>
	);
}

/** Editable rows for reagents or equipment, with a button that adds one more. */
export function QuantityEditor({
	addLabel,
	kind,
	items,
	onChange,
}: {
	addLabel: string;
	/** "reactivo" or "equipo", used in each field's accessible name. */
	kind: string;
	items: QuantityDraft[];
	onChange: (items: QuantityDraft[]) => void;
}) {
	const change = (index: number, patch: Partial<QuantityDraft>) =>
		onChange(
			items.map((item, itemIndex) =>
				itemIndex === index ? { ...item, ...patch } : item,
			),
		);
	return (
		<>
			{items.map((item, index) => (
				<div className={editorRow} key={item.key}>
					<Input
						aria-label={`Nombre del ${kind} ${index + 1}`}
						className="col-span-2"
						onChange={(event) => change(index, { name: event.target.value })}
						placeholder="Nombre"
						required
						value={item.name}
					/>
					<Input
						aria-label={`Cantidad del ${kind} ${index + 1}`}
						min="0.000001"
						onChange={(event) => change(index, { amount: event.target.value })}
						placeholder="Cantidad"
						required={item.unit.trim() !== ""}
						step="any"
						type="number"
						value={item.amount}
					/>
					<Input
						aria-label={`Unidad del ${kind} ${index + 1}`}
						onChange={(event) => change(index, { unit: event.target.value })}
						placeholder="g, mL, pza"
						required={item.amount.trim() !== ""}
						value={item.unit}
					/>
					<OptionSelect
						aria-label={`Base del ${kind} ${index + 1}`}
						className="w-full"
						onValueChange={(value) =>
							change(index, { basis: value as QuantityItem["basis"] })
						}
						options={basisOptions}
						value={item.basis}
					/>
					<Button
						aria-label={`Quitar ${kind} ${index + 1}`}
						onClick={() =>
							onChange(items.filter((_, itemIndex) => itemIndex !== index))
						}
						size="sm"
						variant="outline"
					>
						Quitar
					</Button>
				</div>
			))}
			<AddButton onClick={() => onChange([...items, emptyQuantityDraft()])}>
				{addLabel}
			</AddButton>
		</>
	);
}

const wasteFields = [
	["name", "Residuo", "Nombre"],
	["container", "Contenedor del residuo", "Contenedor"],
	["treatment", "Tratamiento del residuo", "Tratamiento"],
] as const;

/** Editable rows for expected waste, with a button that adds one more. */
export function WasteEditor({
	items,
	onChange,
}: {
	items: WasteDraft[];
	onChange: (items: WasteDraft[]) => void;
}) {
	return (
		<>
			{items.map((item, index) => (
				<div className={editorRow} key={item.key}>
					{wasteFields.map(([field, label, placeholder]) => (
						<Input
							aria-label={`${label} ${index + 1}`}
							key={field}
							onChange={(event) =>
								onChange(
									items.map((current, itemIndex) =>
										itemIndex === index
											? { ...current, [field]: event.target.value }
											: current,
									),
								)
							}
							placeholder={placeholder}
							required={field === "treatment"}
							value={item[field]}
						/>
					))}
					<Button
						aria-label={`Quitar residuo ${index + 1}`}
						onClick={() =>
							onChange(items.filter((_, itemIndex) => itemIndex !== index))
						}
						size="sm"
						variant="outline"
					>
						Quitar
					</Button>
				</div>
			))}
			<AddButton onClick={() => onChange([...items, emptyWasteDraft()])}>
				Agregar residuo
			</AddButton>
		</>
	);
}
