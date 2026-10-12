import {
	Document,
	Font,
	Page,
	PDFDownloadLink,
	PDFViewer,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { Fragment, type ReactNode, useMemo, useState } from "react";
import {
	formatTicketDate,
	type TicketExercise,
	type TicketGroup,
	type TicketProfessor,
	type TicketReagent,
	type TicketWaste,
} from "../lib/daily-ticket.ts";
import { Button } from "./ui/button.tsx";

// Fira Mono has the subscripts and superscripts of chemical formulas, which the legacy Inconsolata lacks.
Font.register({
	family: "Fira Mono",
	fonts: [
		{
			src: "https://fonts.gstatic.com/s/firamono/v16/N0bX2SlFPv1weGeLZDtQIQ.ttf",
		},
		{
			src: "https://fonts.gstatic.com/s/firamono/v16/N0bS2SlFPv1weGeLZDtondv3mQ.ttf",
			fontWeight: 700,
		},
	],
});

// Copied from the legacy PDFTicket so the printed ticket keeps its layout.
const styles = StyleSheet.create({
	page: {
		padding: "16px 0",
	},

	ticket: {
		width: "80mm",
		fontFamily: "Fira Mono",
		fontSize: 10,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "4px",
		padding: "4px 8px",
	},

	ticketHeader: {
		width: "100%",
		textAlign: "center",
	},

	title: {
		fontSize: 32,
		fontWeight: "bold",
	},

	subtitle: {
		// Fira Mono is wider than the legacy font. At 10pt this line would wrap mid-word.
		fontSize: 8.5,
		fontWeight: "bold",
	},

	assignmentContainer: {
		borderTop: "1px solid black",
		width: "100%",
		textAlign: "center",
		fontWeight: "bold",
	},

	assignmentTitle: {
		fontSize: 12,
	},

	requests: {
		fontSize: 12,
		fontWeight: "bold",
		margin: "8px 0",
	},

	request: {
		width: "100%",
		marginBottom: "8px",
	},

	requestHeader: {
		padding: "4px 0",
		borderTop: "1px solid black",
		borderBottom: "1px solid black",
		fontWeight: "bold",
		width: "100%",
		textAlign: "center",
	},

	group: {
		borderTop: "1px dotted black",
		flexDirection: "column",
		alignItems: "center",
		gap: "4px",
		width: "100%",
		marginBottom: "4px",
	},

	groupTitle: {
		fontWeight: "bold",
	},

	groupContent: {
		width: "100%",
		flexDirection: "column",
		alignItems: "flex-start",
	},

	groupLabel: {
		fontWeight: "bold",
	},

	groupData: {
		fontWeight: "normal",
		textAlign: "left",
	},

	subsection: {
		marginTop: "4px",
		borderTop: "1px solid black",
	},

	subsectionHeader: {
		fontSize: 12,
		textAlign: "center",
	},

	itemsContent: {
		flexDirection: "column",
		alignItems: "flex-start",
		width: "100%",
	},

	itemsContentHeader: {
		borderBottom: "1px solid black",
		fontWeight: "bold",
		flexDirection: "row",
		justifyContent: "space-between",
		width: "100%",
	},

	itemsContentItem: {
		borderBottom: "1px dotted black",
		flexDirection: "row",
		fontWeight: "normal",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
	},

	wasteContentItem: {
		borderBottom: "1px dotted black",
		flexDirection: "column",
		fontWeight: "normal",
		alignItems: "flex-start",
		width: "100%",
	},

	itemName: {
		maxWidth: "70%",
		textAlign: "left",
	},

	itemQuantity: {
		maxWidth: "25%",
		textAlign: "right",
	},

	comments: {
		width: "100%",
		textAlign: "left",
		fontWeight: "bold",
	},

	extras: {
		marginTop: "4px",
		width: "100%",
		textAlign: "left",
		fontWeight: "bold",
	},

	extrasItem: {
		borderBottom: "1px dotted black",
	},

	normal: {
		fontWeight: "normal",
	},

	wasteLabel: {
		fontWeight: "bold",
		textAlign: "left",
	},

	wasteData: {
		fontWeight: "normal",
		textAlign: "left",
	},

	footer: {
		margin: "8px 0 4px",
		width: "100%",
		textAlign: "center",
		fontWeight: "bold",
	},
});

/** The daily ticket: a PDF viewer on desktop, a download link on mobile. */
export default function PDFTicket({
	exercises,
	date,
}: {
	exercises: TicketExercise[];
	date: string;
}) {
	// Decided once, as in the legacy ticket. This component only loads in the browser.
	const [isMobile] = useState(() => window.innerWidth < 768);
	// The document prints the current time, so a new one would redraw the viewer.
	const ticketDoc = useMemo(
		() => ticketDocument(exercises, date),
		[exercises, date],
	);

	if (isMobile) {
		return (
			<Button asChild size="lg">
				<PDFDownloadLink document={ticketDoc} fileName={ticketTitle(date)}>
					Descargar PDF
				</PDFDownloadLink>
			</Button>
		);
	}

	return (
		<PDFViewer className="size-[95%] rounded-lg" showToolbar>
			{ticketDoc}
		</PDFViewer>
	);
}

function ticketDocument(exercises: TicketExercise[], date: string) {
	return (
		<Document title={ticketTitle(date)} author="SISLAB" language="es">
			<Page size="A4" style={styles.page}>
				<View style={styles.ticket}>
					<TicketHeader />
					<Text>{`${format(
						new Date(),
						"dd/LL/yyyy HH:mm",
					)} - Solicitudes ${formatTicketDate(date)}`}</Text>
					{exercises.map((exercise) => (
						<Exercise key={exercise.id} exercise={exercise} />
					))}
					<View style={styles.footer}>
						<Text>https://sislab.unison.mx</Text>
					</View>
				</View>
			</Page>
		</Document>
	);
}

function ticketTitle(date: string): string {
	return `SISLAB Solicitudes - ${formatTicketDate(date)}`;
}

function TicketHeader() {
	return (
		<View style={styles.ticketHeader}>
			<Text style={styles.title}>SISLAB</Text>
			<Text style={styles.subtitle}>
				Sistema de Solicitudes para Laboratorios
			</Text>
		</View>
	);
}

function Exercise({ exercise }: { exercise: TicketExercise }) {
	const { professors } = exercise;

	return (
		<View style={styles.assignmentContainer}>
			<Text
				style={styles.assignmentTitle}
			>{`Práctica ${exercise.number}`}</Text>
			<Text>{exercise.name}</Text>
			<Text style={styles.requests}>Solicitudes</Text>
			{professors.map((professor, index) => (
				<Request key={professor.id} professor={professor} index={index} />
			))}
			<Reagents reagents={exercise.reagents} professors={professors} />
			<Equipment equipment={exercise.equipment} professors={professors} />
			<Waste waste={exercise.waste} professors={professors} />
		</View>
	);
}

function Request({
	index,
	professor,
}: {
	index: number;
	professor: TicketProfessor;
}) {
	return (
		<View style={styles.request}>
			<View style={styles.requestHeader}>
				<Text>{`Solicitud ${index + 1}`}</Text>
				<Text>{`Profesor: ${professor.name}`}</Text>
			</View>
			{professor.requests.map((request, index) => (
				<Group key={request.id} group={request} index={index} />
			))}
		</View>
	);
}

function Group({ group, index }: { group: TicketGroup; index: number }) {
	return (
		<View style={styles.group}>
			<Text style={styles.groupTitle}>{`Grupo ${index + 1}`}</Text>
			<View style={styles.groupContent}>
				<Text style={styles.groupLabel}>
					# de equipos: <Text style={styles.groupData}>{group.teams}</Text>
				</Text>
				<Text style={styles.groupLabel}>
					Fecha:{" "}
					<Text
						style={styles.groupData}
					>{`${group.date} ${group.timeslot}`}</Text>
				</Text>
				<Text style={styles.groupLabel}>
					Laboratorio: <Text style={styles.groupData}>{group.lab}</Text>
				</Text>
				{group.customReagents.length > 0 && (
					<Text style={styles.groupLabel}>
						Extras:{" "}
						<Text style={styles.groupData}>
							{group.customReagents.map(extraReagent).join(", ")}
						</Text>
					</Text>
				)}
				{group.comments.length > 0 && (
					<View style={styles.comments}>
						<Text>Comentarios</Text>
						{group.comments.map((comment) => (
							<View key={comment} style={styles.extrasItem}>
								<Text style={styles.normal}>{comment}</Text>
							</View>
						))}
					</View>
				)}
			</View>
		</View>
	);
}

function Reagents({
	reagents,
	professors,
}: {
	reagents: TicketReagent[];
	professors: TicketProfessor[];
}) {
	const shouldRenderExtras = professors.some((professor) =>
		professor.requests.some((request) => request.customReagents.length > 0),
	);

	const shouldRenderOmitted = professors.some((professor) =>
		professor.requests.some((request) => request.omittedReagents.length > 0),
	);

	return (
		<View style={styles.subsection}>
			<Text style={styles.subsectionHeader}>Reactivos</Text>
			{reagents.length < 1 ? (
				<Text>Esta práctica no requiere reactivos</Text>
			) : (
				<View style={styles.itemsContent}>
					<View style={styles.itemsContentHeader}>
						<Text>Nombre</Text>
						<Text>Cantidad</Text>
					</View>
					{reagents.map((reagent) => (
						<View key={reagent.reagent} style={styles.itemsContentItem}>
							<Text style={styles.itemName}>{reagent.reagent}</Text>
							<Text style={styles.itemQuantity}>{`${
								reagent.quantity || "--"
							}${reagent.unit || "--"}`}</Text>
						</View>
					))}
				</View>
			)}
			<View style={styles.extras}>
				<Text>Omitidos</Text>
				{!shouldRenderOmitted ? (
					<Text>No se omitieron reactivos para esta práctica</Text>
				) : (
					// As in the legacy ticket, every group gets a line here, even one that omitted nothing.
					<ExtrasByGroup professors={professors} separator=": ">
						{(request) =>
							request.omittedReagents.map((reagent) => (
								<Text key={reagent} style={styles.normal}>
									{reagent}
								</Text>
							))
						}
					</ExtrasByGroup>
				)}
			</View>
			<View style={styles.extras}>
				<Text>Extras</Text>
				{!shouldRenderExtras ? (
					<Text>No se registraron extras para esta práctica</Text>
				) : (
					<ExtrasByGroup professors={professors} separator=": ">
						{(request) =>
							request.customReagents.length > 0 &&
							request.customReagents.map((reagent) => (
								<Text key={extraReagent(reagent)} style={styles.normal}>
									{extraReagent(reagent)}
								</Text>
							))
						}
					</ExtrasByGroup>
				)}
			</View>
		</View>
	);
}

function Equipment({
	equipment,
	professors,
}: {
	equipment: string[];
	professors: TicketProfessor[];
}) {
	const shouldRenderExtras = professors.some((professor) =>
		professor.requests.some((request) => request.customEquipment.length > 0),
	);

	return (
		<View style={styles.subsection}>
			<Text style={styles.subsectionHeader}>Equipo</Text>
			<View style={styles.itemsContent}>
				{equipment.length < 1 ? (
					<Text>Esta práctica no requiere equipo</Text>
				) : (
					<>
						<View style={styles.itemsContentHeader}>
							<Text>Nombre</Text>
						</View>
						{equipment.map((item) => (
							<View key={item} style={styles.itemsContentItem}>
								<Text style={styles.itemName}>{item}</Text>
							</View>
						))}
					</>
				)}
			</View>
			<View style={styles.extras}>
				<Text>Extras</Text>
				{!shouldRenderExtras ? (
					<Text>No se registraron extras para esta práctica</Text>
				) : (
					<ExtrasByGroup professors={professors} separator=": ">
						{(request) =>
							request.customEquipment.length > 0 &&
							request.customEquipment.map((item) => (
								<Text key={item} style={styles.normal}>
									{item}
								</Text>
							))
						}
					</ExtrasByGroup>
				)}
			</View>
		</View>
	);
}

function Waste({
	waste,
	professors,
}: {
	waste: TicketWaste[];
	professors: TicketProfessor[];
}) {
	const shouldRenderExtras = professors.some((professor) =>
		professor.requests.some((request) => request.customWaste.length > 0),
	);

	return (
		<View style={styles.subsection}>
			<Text style={styles.subsectionHeader}>Residuos</Text>
			<View style={styles.itemsContent}>
				{waste.length < 1 ? (
					<Text>Esta práctica no deja residuos</Text>
				) : (
					waste.map((wasteItem) => (
						<View key={wasteKey(wasteItem)} style={styles.wasteContentItem}>
							<WasteLines waste={wasteItem} />
						</View>
					))
				)}
			</View>
			<View style={styles.extras}>
				<Text>Extras</Text>
				{!shouldRenderExtras ? (
					<Text>No se registraron extras para esta práctica</Text>
				) : (
					<ExtrasByGroup professors={professors} separator="">
						{(request) =>
							request.customWaste.length > 0 &&
							request.customWaste.map((item) => (
								<View key={wasteKey(item)}>
									<WasteLines waste={item} />
								</View>
							))
						}
					</ExtrasByGroup>
				)}
			</View>
		</View>
	);
}

/** One "Solicitud n | Grupo n" block per group for which `children` returns content. */
function ExtrasByGroup({
	professors,
	separator,
	children,
}: {
	professors: TicketProfessor[];
	separator: string;
	children: (request: TicketGroup) => ReactNode;
}) {
	return professors.map((professor, profIndex) =>
		professor.requests.map((request, reqIndex) => {
			const content = children(request);
			return (
				content !== false && (
					<View key={request.id} style={styles.extrasItem}>
						<Text>
							{`Solicitud ${profIndex + 1} | Grupo ${reqIndex + 1}${separator}`}
						</Text>
						{content}
					</View>
				)
			);
		}),
	);
}

function WasteLines({ waste }: { waste: TicketWaste }) {
	return (
		<Fragment>
			{waste.container && (
				<Text style={styles.wasteLabel}>
					Envase: <Text style={styles.wasteData}>{waste.container}</Text>
				</Text>
			)}
			{waste.residue && (
				<Text style={styles.wasteLabel}>
					Residuo: <Text style={styles.wasteData}>{waste.residue}</Text>
				</Text>
			)}
			{waste.treatment && (
				<Text style={styles.wasteLabel}>
					Tratamiento: <Text style={styles.wasteData}>{waste.treatment}</Text>
				</Text>
			)}
		</Fragment>
	);
}

function extraReagent(reagent: TicketReagent): string {
	if (reagent.quantity === null) return reagent.reagent;
	return `${reagent.quantity}${reagent.unit} de ${reagent.reagent}`;
}

function wasteKey(waste: TicketWaste): string {
	return `${waste.residue} ${waste.container} ${waste.treatment}`;
}
