import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { CalendarDays, CircleCheck, Clock } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import {
	DescriptionItem,
	DescriptionList,
} from "../components/description-list.tsx";
import {
	MaterialName,
	MaterialRow,
	QuantityAmount,
	QuantityDetails,
	type QuantityDraft,
	QuantityEditor,
	quantityItems,
	type WasteDraft,
	WasteEditor,
	WasteRow,
	wasteItems,
	wasteSummary,
} from "../components/materials.tsx";
import { Notice } from "../components/notice.tsx";
import { EmptyState, Page, PageHeader } from "../components/page.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardTitle } from "../components/ui/card.tsx";
import { Checkbox } from "../components/ui/checkbox.tsx";
import { Combobox } from "../components/ui/combobox.tsx";
import { DatePicker } from "../components/ui/date-picker.tsx";
import {
	Field,
	FieldDescription,
	FieldLabel,
} from "../components/ui/field.tsx";
import { Label } from "../components/ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group.tsx";
import { Textarea } from "../components/ui/textarea.tsx";
import {
	addDays,
	formatSessionDate,
	groupLabel,
	sessionDateOption,
	sislabNowTime,
	sislabToday,
	timeRange,
	upcomingSessionDates,
} from "../lib/session-dates.ts";
import { userFacingError } from "../lib/user-facing-error.ts";
import { cn } from "../lib/utils.ts";
import { weekdays } from "../lib/weekdays.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";
import {
	getPreparationRequestOptionsFn,
	submitPreparationRequestFn,
} from "../server/preparation-request-functions.ts";
import type { RequestCustomization } from "../server/preparation-requests.ts";

const OFFERED_DATES = 3;
/** How far ahead the calendar lets a professor pick another date. */
const CALENDAR_REACH_DAYS = 365;

export const Route = createFileRoute("/app/requests/new")({
	validateSearch: (search: Record<string, unknown>): { group?: string } =>
		typeof search.group === "string" ? { group: search.group } : {},
	loader: async () => {
		const user = await getCurrentSessionFn();
		if (!user) throw redirect({ to: "/sign-in" });
		if (!user.roles.includes("professor"))
			throw redirect({ to: "/app/dashboard" });
		return {
			...(await getPreparationRequestOptionsFn()),
			today: sislabToday(),
			nowTime: sislabNowTime(),
		};
	},
	component: NewPreparationRequestPage,
});

function NewPreparationRequestPage() {
	const { groups, exercises, minimumNoticeDays, today, nowTime } =
		Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = useNavigate();
	const [groupId, setGroupId] = useState(
		groups.some((group) => group.id === search.group)
			? (search.group ?? "")
			: "",
	);
	const [exerciseId, setExerciseId] = useState("");
	const [sessionDate, setSessionDate] = useState("");
	const [omittedReagents, setOmittedReagents] = useState<string[]>([]);
	const [addedReagents, setAddedReagents] = useState<QuantityDraft[]>([]);
	const [addedEquipment, setAddedEquipment] = useState<QuantityDraft[]>([]);
	const [addedWaste, setAddedWaste] = useState<WasteDraft[]>([]);
	const [professorNote, setProfessorNote] = useState("");
	const [lateReason, setLateReason] = useState("");
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	const selectedGroup = groups.find((group) => group.id === groupId);
	const selectedExercise = exercises.find(
		(exercise) => exercise.id === exerciseId,
	);
	const dateOptions = selectedGroup
		? upcomingSessionDates({
				weekday: selectedGroup.weekday,
				today,
				nowTime,
				startTime: selectedGroup.startTime,
				minimumNoticeDays,
				count: OFFERED_DATES,
			})
		: [];
	const pickableDate = (date: string) =>
		selectedGroup
			? sessionDateOption({
					date,
					weekday: selectedGroup.weekday,
					today,
					nowTime,
					startTime: selectedGroup.startTime,
					minimumNoticeDays,
				})
			: null;
	const customPicked =
		sessionDate !== "" &&
		!dateOptions.some((option) => option.date === sessionDate);
	const needsLateReason = sessionDate
		? (pickableDate(sessionDate)?.late ?? false)
		: false;
	const materials = selectedExercise?.materials;
	const teams = selectedGroup?.teams ?? 0;
	const totals = [
		...(materials?.reagents.map((item) => ({
			item,
			omitted: omittedReagents.includes(item.name),
		})) ?? []),
		...quantityItems(addedReagents)
			.filter((item) => item.name.trim())
			.map((item) => ({ item, omitted: false })),
	].filter(({ item }) => item.amount !== null);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedGroup || !selectedExercise || !sessionDate) {
			setMessage("Elige un grupo, una fecha y una práctica para continuar.");
			return;
		}
		setBusy(true);
		setMessage("");
		const customization: RequestCustomization = {
			omittedReagents,
			addedReagents: quantityItems(addedReagents),
			addedEquipment: quantityItems(addedEquipment),
			addedWaste: wasteItems(addedWaste),
			professorNote: professorNote || null,
			lateReason: needsLateReason ? lateReason : null,
		};
		try {
			await submitPreparationRequestFn({
				data: { groupId, exerciseId, sessionDate, customization },
			});
			await navigate({ to: "/app/requests/mine" });
		} catch (error) {
			setMessage(
				userFacingError(
					error,
					"No se pudo enviar tu solicitud. Inténtalo de nuevo más tarde.",
				),
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<Page size="narrow">
			<PageHeader
				description="Pide al personal de laboratorio que prepare reactivos, equipo y manejo de residuos para una práctica de uno de tus grupos."
				title="Nueva solicitud"
			/>

			<div className="flex flex-wrap items-start gap-7">
				<Card
					asChild
					className="max-w-[640px] flex-[1_1_480px] gap-8 p-7 max-md:p-5"
				>
					<form onSubmit={submit}>
						<Step>
							<StepTitle id="request-step-group" number={1}>
								Elige el grupo
							</StepTitle>
							{groups.length === 0 && (
								<EmptyState>
									No tienes grupos activos.{" "}
									<Link to="/app/groups/new">Registra un grupo</Link>
								</EmptyState>
							)}
							<RadioGroup
								aria-labelledby="request-step-group"
								onValueChange={(value) => {
									setGroupId(value);
									setSessionDate("");
								}}
								value={groupId}
							>
								{groups.map((group) => (
									<Label
										className="cursor-pointer gap-3.5 rounded-lg border bg-card px-3.5 py-3 text-base font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:shadow-[0_0_0_1px_var(--primary)]"
										key={group.id}
									>
										<RadioGroupItem value={group.id} />
										<span className="flex min-w-0 flex-1 flex-col">
											<strong>
												{group.subjectName} · {groupLabel(group.number)}
											</strong>
											<span className="text-sm text-muted-foreground">
												{weekdays[group.weekday]},{" "}
												{timeRange(group.startTime, group.endTime)} ·{" "}
												{group.labName}
											</span>
										</span>
									</Label>
								))}
							</RadioGroup>
						</Step>

						<Step>
							<StepTitle number={2}>Elige la fecha</StepTitle>
							{selectedGroup ? (
								<>
									<StepHelp>
										Solo se ofrecen los {weekdayPlural(selectedGroup.weekday)},
										el día de este grupo.
									</StepHelp>
									{/* biome-ignore lint/a11y/useSemanticElements: the step heading already names this group of buttons */}
									<div
										aria-label="Fechas disponibles"
										className="flex flex-wrap gap-2.5"
										role="group"
									>
										{dateOptions.map(({ date, late }) => (
											<Button
												aria-pressed={sessionDate === date}
												key={date}
												onClick={() => setSessionDate(date)}
												size="lg"
												variant="choice"
											>
												{formatSessionDate(date, "short")}
												<DateNote>{noticeLabel(late)}</DateNote>
											</Button>
										))}
										<DatePicker
											footer={`Solo puedes elegir ${weekdayPlural(selectedGroup.weekday)}, el día de este grupo.`}
											isDateDisabled={(date) => !pickableDate(date)}
											max={addDays(today, CALENDAR_REACH_DAYS)}
											min={today}
											onValueChange={setSessionDate}
											trigger={
												<Button
													aria-pressed={customPicked}
													className="flex-row items-center gap-2.5"
													size="lg"
													variant="choice"
												>
													<CalendarDays
														aria-hidden="true"
														size={18}
														strokeWidth={1.75}
													/>
													<span className="flex flex-col items-start">
														{customPicked
															? formatSessionDate(sessionDate, "short")
															: "Elegir otra fecha"}
														<DateNote>
															{customPicked
																? noticeLabel(needsLateReason)
																: `Solo ${weekdayPlural(selectedGroup.weekday)}`}
														</DateNote>
													</span>
												</Button>
											}
											value={customPicked ? sessionDate : ""}
										/>
									</div>
								</>
							) : (
								<StepHelp>Elige un grupo para ver sus fechas.</StepHelp>
							)}
							{needsLateReason && (
								<Field>
									<FieldLabel htmlFor="request-late-reason">
										Motivo del aviso corto
									</FieldLabel>
									<Textarea
										id="request-late-reason"
										maxLength={1000}
										onChange={(event) => setLateReason(event.target.value)}
										placeholder="Explica por qué solicitas la preparación con poco tiempo."
										required
										value={lateReason}
									/>
									<FieldDescription>
										El personal de laboratorio decidirá si acepta la solicitud.
									</FieldDescription>
								</Field>
							)}
						</Step>

						<Step>
							<StepTitle number={3}>Elige la práctica</StepTitle>
							<Field>
								<FieldLabel htmlFor="request-exercise">
									Práctica de laboratorio
								</FieldLabel>
								<Combobox
									emptyText="Ninguna práctica coincide."
									fieldVariant="filled"
									id="request-exercise"
									onValueChange={(value) => {
										setExerciseId(value);
										setOmittedReagents([]);
									}}
									options={exercises.map((exercise) => ({
										value: exercise.id,
										label: `${exercise.number} · ${exercise.name}`,
									}))}
									placeholder="Elige una práctica"
									searchPlaceholder="Buscar por número o nombre"
									value={exerciseId}
								/>
							</Field>
						</Step>

						<Step>
							<StepTitle number={4}>Revisa el material</StepTitle>
							<StepHelp>
								Desmarca los reactivos que no necesites y quedarán tachados como
								omitidos. Puedes agregar equipo y residuos.
							</StepHelp>

							<div>
								<MaterialHeading>Reactivos</MaterialHeading>
								{materials?.reagents.map((item) => {
									const omitted = omittedReagents.includes(item.name);
									return (
										<Label
											className="cursor-pointer gap-3 border-t py-2.5 text-base font-normal"
											key={`${item.name}-${item.amount}-${item.unit}-${item.basis}`}
										>
											<Checkbox
												checked={!omitted}
												onCheckedChange={() =>
													setOmittedReagents((current) =>
														omitted
															? current.filter((name) => name !== item.name)
															: [...current, item.name],
													)
												}
											/>
											<MaterialName omitted={omitted}>{item.name}</MaterialName>
											{omitted && <Badge variant="muted">Omitido</Badge>}
											<QuantityDetails item={item} omitted={omitted} />
										</Label>
									);
								})}
								<QuantityEditor
									addLabel="Agregar reactivo"
									items={addedReagents}
									kind="reactivo"
									onChange={setAddedReagents}
								/>

								<MaterialHeading>Equipo</MaterialHeading>
								{materials?.equipment.map((item) => (
									<MaterialRow
										key={`${item.name}-${item.amount}-${item.unit}-${item.basis}`}
									>
										<MaterialName>{item.name}</MaterialName>
										<QuantityDetails item={item} />
									</MaterialRow>
								))}
								<QuantityEditor
									addLabel="Agregar equipo"
									items={addedEquipment}
									kind="equipo"
									onChange={setAddedEquipment}
								/>

								<MaterialHeading>Residuos esperados</MaterialHeading>
								{materials?.waste.map((item) => (
									<WasteRow item={item} key={wasteSummary(item)} />
								))}
								<WasteEditor items={addedWaste} onChange={setAddedWaste} />
							</div>
						</Step>

						<Field>
							<FieldLabel htmlFor="request-note">
								Nota para el personal (opcional)
							</FieldLabel>
							<Textarea
								id="request-note"
								maxLength={2000}
								onChange={(event) => setProfessorNote(event.target.value)}
								placeholder="Por ejemplo: necesito las buretas limpias desde las 16:30."
								value={professorNote}
							/>
						</Field>

						{message && <Notice tone="error">{message}</Notice>}

						<div className="flex flex-wrap gap-3 pt-1">
							<Button disabled={busy} size="lg" type="submit">
								{busy ? "Enviando…" : "Enviar solicitud"}
							</Button>
							<Button asChild size="lg" variant="outline">
								<Link to="/app/dashboard">Cancelar</Link>
							</Button>
						</div>
					</form>
				</Card>

				<aside
					aria-labelledby="request-summary-title"
					className="flex max-w-[380px] min-w-0 flex-[1_1_300px] flex-col gap-4"
				>
					<Card className="gap-4">
						<CardTitle className="text-xl" id="request-summary-title">
							Resumen
						</CardTitle>
						<DescriptionList>
							<DescriptionItem emphasis term="Grupo">
								{selectedGroup
									? `${selectedGroup.subjectName} · ${groupLabel(selectedGroup.number)}`
									: "Elige un grupo"}
							</DescriptionItem>
							<DescriptionItem term="Fecha y hora">
								{selectedGroup && sessionDate
									? `${formatSessionDate(sessionDate, "long")}, ${timeRange(selectedGroup.startTime, selectedGroup.endTime)}`
									: "Elige una fecha"}
							</DescriptionItem>
							<DescriptionItem term="Laboratorio">
								{selectedGroup?.labName ?? "—"}
							</DescriptionItem>
							<DescriptionItem term="Práctica">
								{selectedExercise
									? `${selectedExercise.number} · ${selectedExercise.name}`
									: "Elige una práctica"}
							</DescriptionItem>
						</DescriptionList>
						{selectedGroup && totals.length > 0 && (
							<div className="flex flex-col gap-2 border-t pt-4">
								<h3 className="text-[15px] font-bold">Cantidades calculadas</h3>
								<p className="text-[13.5px] text-muted-foreground">
									{teams} {teams === 1 ? "equipo" : "equipos"} en el grupo. Pasa
									el cursor sobre una cantidad por equipo para ver el total del
									grupo.
								</p>
								<ul className="grid gap-1.5 font-mono text-[13px] tabular-nums">
									{totals.map(({ item, omitted }) => (
										<li
											className={cn(
												"flex justify-between gap-3",
												omitted &&
													"text-muted-foreground line-through decoration-[1.5px]",
											)}
											key={`${item.name}-${item.unit}-${item.basis}`}
										>
											<span>{item.name}</span>
											<strong>
												<QuantityAmount item={item} teams={teams} />
											</strong>
										</li>
									))}
								</ul>
							</div>
						)}
					</Card>

					{sessionDate &&
						(needsLateReason ? (
							<Notice icon={Clock} tone="warning">
								<strong>
									Menos de {noticeDays(minimumNoticeDays)} de aviso.
								</strong>{" "}
								Explica el motivo. El personal de laboratorio decidirá si acepta
								la solicitud.
							</Notice>
						) : (
							<Notice icon={CircleCheck}>
								<strong>
									Cumple el aviso mínimo de {noticeDays(minimumNoticeDays)}.
								</strong>{" "}
								Si eliges una fecha más cercana, tendrás que explicar el motivo
								y el personal decidirá si la acepta.
							</Notice>
						))}

					<p className="text-[13.5px] text-pretty text-muted-foreground">
						Al enviar se guarda una copia de estos datos. Si después cambias la
						práctica o el grupo, esta solicitud no se modifica.
					</p>
				</aside>
			</div>
		</Page>
	);
}

function Step({ children }: { children: ReactNode }) {
	return <div className="flex min-w-0 flex-col gap-3.5">{children}</div>;
}

function StepTitle({
	number,
	id,
	children,
}: {
	number: number;
	id?: string;
	children: ReactNode;
}) {
	return (
		<h2 className="flex items-center gap-3 text-[19px] font-bold" id={id}>
			<span
				aria-hidden="true"
				className="flex size-7 flex-none items-center justify-center rounded-full bg-accent text-sm font-bold text-primary-text"
			>
				{number}
			</span>
			{children}
		</h2>
	);
}

function StepHelp({ children }: { children: ReactNode }) {
	return <p className="text-[14.5px] text-muted-foreground">{children}</p>;
}

function MaterialHeading({ children }: { children: ReactNode }) {
	return (
		<h3 className="mt-3 mb-1 text-[15px] font-bold text-primary-text">
			{children}
		</h3>
	);
}

/** The small second line under a date. */
function DateNote({ children }: { children: ReactNode }) {
	return (
		<span className="text-xs font-medium text-muted-foreground">
			{children}
		</span>
	);
}

function weekdayPlural(weekday: number) {
	const name = weekdays[weekday].toLocaleLowerCase("es-MX");
	return name.endsWith("s") ? name : `${name}s`;
}

function noticeLabel(late: boolean) {
	return late ? "Último momento" : "A tiempo";
}

function noticeDays(days: number) {
	return `${days} ${days === 1 ? "día" : "días"}`;
}
