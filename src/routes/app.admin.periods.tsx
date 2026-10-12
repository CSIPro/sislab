import { createFileRoute, redirect } from "@tanstack/react-router";
import { CircleCheck, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
	DescriptionItem,
	DescriptionList,
} from "../components/description-list.tsx";
import { FormDialog } from "../components/form-dialog.tsx";
import { Notice, type NoticeState } from "../components/notice.tsx";
import { EmptyState, Footnote, Page, PageHeader } from "../components/page.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardFooter, CardTitle } from "../components/ui/card.tsx";
import { DatePicker } from "../components/ui/date-picker.tsx";
import {
	Field,
	FieldDescription,
	FieldLabel,
} from "../components/ui/field.tsx";
import { Input } from "../components/ui/input.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableEmpty,
	TableHead,
	TableHeader,
	TableRow,
} from "../components/ui/table.tsx";
import {
	type AcademicPeriodStatus,
	academicPeriodStatus,
	currentAcademicPeriodCode,
	regularPeriodCodes,
} from "../lib/academic-period.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import {
	ensureRegularAcademicPeriodsFn,
	listAcademicPeriodsWithGroupCountsFn,
	saveAcademicPeriodFn,
} from "../server/academic-period-functions.ts";
import type { AcademicPeriod } from "../server/academic-periods.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/app/admin/periods")({
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("admin")) throw redirect({ to: "/app/dashboard" });
		return { periods: await listAcademicPeriodsWithGroupCountsFn() };
	},
	component: AcademicPeriodsPage,
});

const statusBadges = {
	current: ["success", "Actual"],
	upcoming: ["info", "Próximo"],
	concluded: ["neutral", "Concluido"],
} as const satisfies Record<AcademicPeriodStatus, readonly [string, string]>;

type PeriodDraft = {
	/** False while adding a period, when the code can still be typed. */
	editing: boolean;
	code: string;
	startsOn: string;
	endsOn: string;
};

function AcademicPeriodsPage() {
	const initial = Route.useLoaderData();
	const [periods, setPeriods] = useState(initial.periods);
	const currentCode = currentAcademicPeriodCode();
	const [selectedCode, setSelectedCode] = useState(
		(
			initial.periods.find(({ code }) => code === currentCode) ??
			initial.periods.at(-1)
		)?.code ?? null,
	);
	const [draft, setDraft] = useState<PeriodDraft | null>(null);
	const [notice, setNotice] = useState<NoticeState>(null);
	const [busy, setBusy] = useState(false);
	const currentYear = Number(currentCode.split("-")[0]);
	const seedYears = [currentYear, currentYear + 1];
	const seedCodes = seedYears.flatMap((year) => regularPeriodCodes(year));
	const allSeeded = seedCodes.every((code) =>
		periods.some((period) => period.code === code),
	);
	const selected = periods.find(({ code }) => code === selectedCode) ?? null;

	function open(next: PeriodDraft | null) {
		setDraft(next);
		setNotice(null);
	}

	async function seedPeriods() {
		setBusy(true);
		setNotice(null);
		const existing = seedCodes.filter((code) =>
			periods.some((period) => period.code === code),
		);
		const added = seedCodes.filter((code) => !existing.includes(code));
		try {
			await ensureRegularAcademicPeriodsFn({ data: { years: seedYears } });
			setPeriods(await listAcademicPeriodsWithGroupCountsFn());
			setNotice({
				text: `Se agregaron ${listed(added)}.${
					existing.length > 0
						? ` ${listed(existing)} ya ${existing.length === 1 ? "existía, así que se dejó como estaba" : "existían, así que se dejaron como estaban"}.`
						: ""
				} Puedes agregar las fechas oficiales cuando las tengas.`,
				error: false,
			});
		} catch {
			setNotice({
				text: "No se pudieron crear los períodos. Inténtalo de nuevo.",
				error: true,
			});
		} finally {
			setBusy(false);
		}
	}

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!draft) return;
		setBusy(true);
		setNotice(null);
		try {
			const saved = await saveAcademicPeriodFn({
				data: {
					code: draft.code,
					startsOn: draft.startsOn || null,
					endsOn: draft.endsOn || null,
				},
			});
			setPeriods(await listAcademicPeriodsWithGroupCountsFn());
			setSelectedCode(saved.code);
			setDraft(null);
			setNotice({ text: `Se guardó el período ${saved.code}.`, error: false });
		} catch (error) {
			setNotice({
				text: userFacingError(error, "No se pudo guardar este período."),
				error: true,
			});
		} finally {
			setBusy(false);
		}
	}

	return (
		<Page size="narrow">
			<PageHeader
				description="Los períodos académicos en los que se registran los grupos. Las fechas oficiales son opcionales."
				title="Períodos"
			>
				<div className="flex flex-wrap items-start gap-3">
					<div className="flex w-min flex-col gap-1.5">
						<Button
							className="whitespace-nowrap"
							disabled={busy || allSeeded}
							onClick={seedPeriods}
							size="lg"
							variant="outline"
						>
							{allSeeded
								? "Períodos agregados"
								: `Agregar períodos ${seedYears.join(" y ")}`}
						</Button>
						<span className="text-[13px] text-muted-foreground">
							Crea {listed(seedCodes)}. Los que ya existen se omiten.
						</span>
					</div>
					<Button
						disabled={busy}
						onClick={() =>
							open({ editing: false, code: "", startsOn: "", endsOn: "" })
						}
						size="lg"
					>
						<Plus aria-hidden="true" size={18} strokeWidth={2} />
						Agregar período
					</Button>
				</div>
			</PageHeader>

			{!draft && notice && (
				<Notice
					icon={notice.error ? undefined : CircleCheck}
					tone={notice.error ? "error" : "success"}
				>
					{notice.text}
				</Notice>
			)}

			<div className="flex flex-wrap items-start gap-6">
				<Table
					className="min-w-[480px]"
					containerClassName="flex-[1.6_1_520px]"
				>
					<TableHeader>
						<TableRow>
							<TableHead>Código</TableHead>
							<TableHead>Inicio</TableHead>
							<TableHead>Fin</TableHead>
							<TableHead>Grupos</TableHead>
							<TableHead>Estado</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{[...periods].reverse().map((period) => {
							const [variant, label] =
								statusBadges[academicPeriodStatus(period.code, currentCode)];
							const isSelected = period.code === selectedCode;
							return (
								<TableRow
									data-state={isSelected ? "selected" : undefined}
									key={period.code}
								>
									<TableCell>
										<Button
											aria-pressed={isSelected}
											className="min-h-0 w-full justify-start rounded-sm px-0 text-left text-[13px] font-bold text-inherit hover:bg-transparent hover:text-primary-text"
											onClick={() => {
												setSelectedCode(period.code);
												setNotice(null);
											}}
											variant="ghost"
										>
											{period.code}
										</Button>
									</TableCell>
									<TableCell>{officialDate(period.startsOn)}</TableCell>
									<TableCell>{officialDate(period.endsOn)}</TableCell>
									<TableCell>{period.groupCount}</TableCell>
									<TableCell>
										<Badge variant={variant}>{label}</Badge>
									</TableCell>
								</TableRow>
							);
						})}
						{periods.length === 0 && (
							<TableEmpty colSpan={5}>Aún no hay períodos.</TableEmpty>
						)}
					</TableBody>
				</Table>

				<Card
					aria-labelledby="period-panel-title"
					className="max-w-[400px] flex-[1_1_300px]"
				>
					{selected ? (
						<PeriodDetail
							busy={busy}
							onEdit={() =>
								open({
									editing: true,
									code: selected.code,
									startsOn: selected.startsOn ?? "",
									endsOn: selected.endsOn ?? "",
								})
							}
							period={selected}
							status={academicPeriodStatus(selected.code, currentCode)}
						/>
					) : (
						<EmptyState id="period-panel-title">
							{periods.length === 0
								? "Aún no hay períodos. Agrega el primero con Agregar período."
								: "Elige un período para ver su detalle."}
						</EmptyState>
					)}
				</Card>
			</div>

			<Footnote>
				Los formularios de grupo sugieren el período actual, pero permiten
				elegir otro. Las fechas del período no limitan las solicitudes.
			</Footnote>

			{draft && (
				<FormDialog
					busy={busy}
					notice={notice}
					onClose={() => open(null)}
					onSubmit={save}
					submitLabel={draft.editing ? "Guardar período" : "Agregar período"}
					title={draft.editing ? `Editar ${draft.code}` : "Agregar período"}
				>
					{!draft.editing && (
						<Field>
							<FieldLabel htmlFor="period-code">Código</FieldLabel>
							<Input
								id="period-code"
								onChange={(event) =>
									setDraft({ ...draft, code: event.target.value })
								}
								pattern="[0-9]{4}-[12]"
								placeholder={`${currentYear + 1}-1`}
								required
								value={draft.code}
							/>
							<FieldDescription>Usa AAAA-1 o AAAA-2.</FieldDescription>
						</Field>
					)}
					<Field>
						<FieldLabel htmlFor="period-starts-on">
							Inicio (opcional)
						</FieldLabel>
						<DatePicker
							clearable
							id="period-starts-on"
							onValueChange={(startsOn) => setDraft({ ...draft, startsOn })}
							value={draft.startsOn}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="period-ends-on">Fin (opcional)</FieldLabel>
						<DatePicker
							clearable
							id="period-ends-on"
							min={draft.startsOn || undefined}
							onValueChange={(endsOn) => setDraft({ ...draft, endsOn })}
							value={draft.endsOn}
						/>
						<FieldDescription>
							Escribe las dos fechas o deja las dos vacías.
						</FieldDescription>
					</Field>
				</FormDialog>
			)}
		</Page>
	);
}

function PeriodDetail({
	period,
	status,
	busy,
	onEdit,
}: {
	period: AcademicPeriod & { groupCount: number };
	status: AcademicPeriodStatus;
	busy: boolean;
	onEdit: () => void;
}) {
	const [variant, label] = statusBadges[status];
	return (
		<>
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col">
					<span className="text-[13px] text-muted-foreground">Período</span>
					<CardTitle className="text-primary-text" id="period-panel-title">
						{period.code}
					</CardTitle>
				</div>
				<Badge variant={variant}>{label}</Badge>
			</div>
			<DescriptionList columns={2}>
				<DescriptionItem term="Inicio">
					{officialDate(period.startsOn)}
				</DescriptionItem>
				<DescriptionItem term="Fin">
					{officialDate(period.endsOn)}
				</DescriptionItem>
				<DescriptionItem term="Grupos">{period.groupCount}</DescriptionItem>
			</DescriptionList>
			<CardFooter>
				<Button disabled={busy} onClick={onEdit} size="lg">
					Editar período
				</Button>
			</CardFooter>
		</>
	);
}

const listFormat = new Intl.ListFormat("es-MX", { type: "conjunction" });
/** "2026-1, 2026-2 y 2027-1" */
function listed(codes: string[]) {
	return listFormat.format(codes);
}

const dateFormat = new Intl.DateTimeFormat("es-MX", {
	timeZone: "UTC",
	dateStyle: "medium",
});
function officialDate(date: string | null) {
	return date ? dateFormat.format(new Date(`${date}T12:00:00Z`)) : "Sin fecha";
}
