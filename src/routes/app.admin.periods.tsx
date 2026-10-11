import { createFileRoute, redirect } from "@tanstack/react-router";
import { CircleCheck, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Notice, type NoticeState } from "../components/notice.tsx";
import { Footnote, Page, PageHeader } from "../components/page.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardTitle } from "../components/ui/card.tsx";
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

const emptyForm = { code: "", startsOn: "", endsOn: "" };

function AcademicPeriodsPage() {
	const initial = Route.useLoaderData();
	const [periods, setPeriods] = useState(initial.periods);
	const [form, setForm] = useState(emptyForm);
	const [editing, setEditing] = useState(false);
	const [notice, setNotice] = useState<NoticeState>(null);
	const [busy, setBusy] = useState(false);
	const currentCode = currentAcademicPeriodCode();
	const currentYear = Number(currentCode.split("-")[0]);
	const seedYears = [currentYear, currentYear + 1];
	const seedCodes = seedYears.flatMap((year) => regularPeriodCodes(year));
	const allSeeded = seedCodes.every((code) =>
		periods.some((period) => period.code === code),
	);

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
		setBusy(true);
		setNotice(null);
		try {
			const saved = await saveAcademicPeriodFn({
				data: {
					code: form.code,
					startsOn: form.startsOn || null,
					endsOn: form.endsOn || null,
				},
			});
			setPeriods(await listAcademicPeriodsWithGroupCountsFn());
			setForm(emptyForm);
			setEditing(false);
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

	function stopEditing() {
		setForm(emptyForm);
		setEditing(false);
	}

	return (
		<Page size="narrow">
			<PageHeader
				description="Los períodos académicos en los que se registran los grupos. Las fechas oficiales son opcionales."
				title="Períodos"
			>
				<div className="flex flex-col items-end gap-1.5">
					<Button
						disabled={busy || allSeeded}
						onClick={seedPeriods}
						size="lg"
						variant="outline"
					>
						<Plus aria-hidden="true" size={18} strokeWidth={2} />
						{allSeeded
							? "Períodos agregados"
							: `Agregar períodos ${seedYears.join(" y ")}`}
					</Button>
					<span className="max-w-80 text-right text-[13px] text-muted-foreground">
						Crea {listed(seedCodes)}. Los que ya existen se omiten.
					</span>
				</div>
			</PageHeader>

			{notice && (
				<Notice
					icon={notice.error ? undefined : CircleCheck}
					tone={notice.error ? "error" : "success"}
				>
					{notice.text}
				</Notice>
			)}

			<div className="flex flex-wrap items-start gap-6">
				<Table
					className="min-w-[560px]"
					containerClassName="flex-[1.6_1_520px]"
				>
					<TableHeader>
						<TableRow>
							<TableHead>Código</TableHead>
							<TableHead>Inicio</TableHead>
							<TableHead>Fin</TableHead>
							<TableHead>Grupos</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{[...periods].reverse().map((period) => {
							const [variant, label] =
								statusBadges[academicPeriodStatus(period.code, currentCode)];
							return (
								<TableRow key={period.code}>
									<TableCell>
										<strong>{period.code}</strong>
									</TableCell>
									<TableCell>{officialDate(period.startsOn)}</TableCell>
									<TableCell>{officialDate(period.endsOn)}</TableCell>
									<TableCell>{period.groupCount}</TableCell>
									<TableCell>
										<Badge variant={variant}>{label}</Badge>
									</TableCell>
									<TableCell>
										<Button
											aria-label={`Editar ${period.code}`}
											disabled={busy}
											onClick={() => {
												setForm({
													code: period.code,
													startsOn: period.startsOn ?? "",
													endsOn: period.endsOn ?? "",
												});
												setEditing(true);
												setNotice(null);
											}}
											size="sm"
											variant="outline"
										>
											Editar
										</Button>
									</TableCell>
								</TableRow>
							);
						})}
						{periods.length === 0 && (
							<TableEmpty colSpan={6}>Aún no hay períodos.</TableEmpty>
						)}
					</TableBody>
				</Table>

				<Card
					aria-labelledby="period-form-title"
					className="max-w-[400px] flex-[1_1_300px]"
				>
					<CardTitle className="text-xl" id="period-form-title">
						{editing ? `Editar ${form.code}` : "Agregar período"}
					</CardTitle>
					<form className="flex flex-col gap-4" onSubmit={save}>
						{!editing && (
							<Field>
								<FieldLabel htmlFor="period-code">Código</FieldLabel>
								<Input
									id="period-code"
									onChange={(event) =>
										setForm({ ...form, code: event.target.value })
									}
									pattern="[0-9]{4}-[12]"
									placeholder={`${currentYear + 1}-1`}
									required
									value={form.code}
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
								onValueChange={(startsOn) => setForm({ ...form, startsOn })}
								value={form.startsOn}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="period-ends-on">Fin (opcional)</FieldLabel>
							<DatePicker
								clearable
								id="period-ends-on"
								min={form.startsOn || undefined}
								onValueChange={(endsOn) => setForm({ ...form, endsOn })}
								value={form.endsOn}
							/>
							<FieldDescription>
								Escribe las dos fechas o deja las dos vacías.
							</FieldDescription>
						</Field>
						<div className="flex flex-wrap gap-3">
							<Button disabled={busy} size="lg" type="submit">
								{editing ? "Guardar período" : "Agregar período"}
							</Button>
							{editing && (
								<Button
									disabled={busy}
									onClick={stopEditing}
									size="lg"
									variant="outline"
								>
									Cancelar
								</Button>
							)}
						</div>
					</form>
				</Card>
			</div>

			<Footnote>
				Los formularios de grupo sugieren el período actual, pero permiten
				elegir otro. Las fechas del período no limitan las solicitudes.
			</Footnote>
		</Page>
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
