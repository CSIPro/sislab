import { createFileRoute } from "@tanstack/react-router";
import { CircleCheck, FileCheck, FlaskConical, UsersRound } from "lucide-react";
import AccessCard from "../components/AccessCard.tsx";
import { getCurrentSessionFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/")({
	loader: () => getCurrentSessionFn(),
	component: LandingPage,
});

const points = [
	"Consulta el día, la hora y el laboratorio de cada uno de tus grupos.",
	"Pide reactivos, equipo y manejo de residuos para cada ejercicio.",
	"El personal prepara todo desde un ticket diario.",
];

const steps = [
	{
		icon: UsersRound,
		title: "Organiza tus grupos",
		text: "Cada grupo tiene su materia, su día y hora y su laboratorio. Todo queda a la vista en tu tablero.",
	},
	{
		icon: FlaskConical,
		title: "Solicita la preparación",
		text: "Elige el ejercicio y la fecha, ajusta reactivos y equipo, e indica los residuos que se generarán.",
	},
	{
		icon: FileCheck,
		title: "El laboratorio prepara",
		text: "El personal prepara desde el ticket diario. Tu solicitud conserva exactamente lo que pediste.",
	},
];

const roles = [
	{
		title: "Profesores",
		items: [
			"Tus próximas solicitudes, con el nombre de cada ejercicio.",
			"Tus grupos con día, horario y laboratorio.",
			"El detalle de cada solicitud en un clic.",
		],
	},
	{
		title: "Personal de laboratorio",
		items: [
			"Solicitudes del día y de la semana de todos los profesores.",
			"Ticket diario en PDF para preparar.",
			"Decisión sobre las solicitudes de último momento.",
		],
	},
	{
		title: "Administración",
		items: [
			"Todo lo del personal de laboratorio.",
			"Activación de cuentas y gestión de usuarios.",
			"Periodos, catálogos y ejercicios.",
		],
	},
];

function LandingPage() {
	const user = Route.useLoaderData();

	return (
		<main className="landing">
			<section className="site-wrap landing-hero">
				<div className="landing-copy">
					<p className="landing-eyebrow">Sistema de Laboratorios</p>
					<h1>Prepara tu laboratorio sin papeleo.</h1>
					<p className="landing-lead">
						SISLAB reúne en un solo lugar tus grupos, el horario de cada
						laboratorio y las solicitudes de preparación de reactivos y equipo.
						Es para profesores y personal de laboratorio de la Universidad de
						Sonora.
					</p>
					<ul className="landing-points">
						{points.map((point) => (
							<li key={point}>
								<CircleCheck aria-hidden="true" size={22} strokeWidth={1.75} />
								<span>{point}</span>
							</li>
						))}
					</ul>
				</div>
				<div className="access-stage" id="acceso">
					<AccessCard user={user} />
				</div>
			</section>

			<section className="site-wrap landing-section" id="como-funciona">
				<div className="landing-section-head">
					<h2>Cómo funciona</h2>
					<p>De la clase al laboratorio en tres pasos.</p>
				</div>
				<div className="landing-grid">
					{steps.map(({ icon: Icon, title, text }, index) => (
						<article className="step-card" key={title}>
							<div className="icon-tile">
								<Icon aria-hidden="true" size={22} strokeWidth={1.75} />
							</div>
							<p className="step-number">Paso {index + 1}</p>
							<h3>{title}</h3>
							<p>{text}</p>
						</article>
					))}
				</div>
			</section>

			<div className="landing-band" id="para-quien">
				<section className="site-wrap landing-section">
					<div className="landing-section-head">
						<h2>Un tablero para cada rol</h2>
						<p>
							Si tu cuenta tiene más de un rol, ves las vistas juntas en el
							mismo tablero.
						</p>
					</div>
					<div className="landing-grid">
						{roles.map(({ title, items }) => (
							<article className="role-card" key={title}>
								<h3>{title}</h3>
								<ul>
									{items.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
							</article>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
