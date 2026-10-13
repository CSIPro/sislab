import { createFileRoute } from "@tanstack/react-router";
import {
	CircleCheck,
	FileCheck,
	FlaskConical,
	Globe,
	Linkedin,
	UsersRound,
} from "lucide-react";
import AccessCard from "../components/AccessCard.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardTitle } from "../components/ui/card.tsx";
import { withBase } from "../lib/base-path.ts";
import { cn } from "../lib/utils.ts";
import { getCurrentSessionFn } from "../server/auth-functions.ts";

export const Route = createFileRoute("/")({
	loader: () => getCurrentSessionFn(),
	component: LandingPage,
});

const points = [
	"Consulta el día, la hora y el laboratorio de cada uno de tus grupos.",
	"Solicita reactivos, equipo y manejo de residuos para cada práctica.",
	"El personal recibe la solicitud y prepara tu laboratorio.",
];

const steps = [
	{
		icon: UsersRound,
		title: "Organiza tus grupos",
		text: "Registra cada grupo con su materia, su día, su hora y su laboratorio. Todo queda a la vista en tu tablero.",
	},
	{
		icon: FlaskConical,
		title: "Solicita la preparación",
		text: "Elige la práctica y la fecha, ajusta reactivos y equipo, e indica los residuos que se generarán.",
	},
	{
		icon: FileCheck,
		title: "El laboratorio prepara",
		text: "El personal recibe la solicitud y prepara tu laboratorio. Tu solicitud conserva exactamente lo que pediste.",
	},
];

const roles = [
	{
		title: "Profesores",
		items: [
			"Tus solicitudes por fecha, con el nombre de cada práctica.",
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
			"Períodos, catálogos y prácticas.",
		],
	},
];

const team = [
	{
		name: "Saúl Eduardo Fimbres Ruíz",
		role: "Desarrollador Full Stack",
		owl: "blue",
		links: [
			{
				icon: Linkedin,
				label: "LinkedIn",
				href: "https://www.linkedin.com/in/fimbressaul/",
			},
		],
	},
	{
		name: "Kevin Ochoa Guerrero",
		role: "Diseñador UX/UI y Desarrollador Front-end",
		owl: "gold",
		links: [
			{
				icon: Linkedin,
				label: "LinkedIn",
				href: "https://www.linkedin.com/in/kevinochoaguerrero/",
			},
			{ icon: Globe, label: "Portafolio", href: "https://kevinochoa.dev/" },
		],
	},
	{
		name: "Saúl Alberto Ramos Laborín",
		role: "Desarrollador Full Stack",
		owl: "black",
		links: [
			{
				icon: Linkedin,
				label: "LinkedIn",
				href: "https://www.linkedin.com/in/sa%C3%BAl-ramos-labor%C3%ADn-82b8291a1",
			},
			{
				icon: Globe,
				label: "Portafolio",
				href: "https://portfolio-saulprl.vercel.app/",
			},
		],
	},
];

function LandingPage() {
	const user = Route.useLoaderData();

	return (
		<main className="bg-card">
			<section
				className={`${wrap} flex flex-wrap items-center gap-14 pt-16 pb-20 max-md:gap-8 max-md:pt-10 max-md:pb-14`}
			>
				<div className="flex min-w-0 flex-[1_1_420px] flex-col gap-6">
					<p className="text-[15px] font-bold text-primary-text">
						Sistema de Laboratorios
					</p>
					<h1 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.08] font-bold tracking-[-0.01em] text-balance">
						Prepara tu laboratorio sin papeleo.
					</h1>
					<p className="max-w-[520px] text-lg leading-[1.6] text-pretty text-muted-foreground">
						SISLAB reúne en un solo lugar tus grupos, el horario de cada
						laboratorio y las solicitudes de preparación de reactivos y equipo.
						Para profesores y personal de laboratorio de la Universidad de
						Sonora.
					</p>
					<ul className="mt-2 flex flex-col gap-3.5">
						{points.map((point) => (
							<li className="flex items-start gap-3" key={point}>
								<CircleCheck
									aria-hidden="true"
									className="mt-0.5 flex-none text-primary-text"
									size={22}
									strokeWidth={1.75}
								/>
								<span>{point}</span>
							</li>
						))}
					</ul>
				</div>
				<div
					className="relative flex min-h-[640px] min-w-0 flex-[1_1_460px] items-center justify-center overflow-hidden rounded-[40px] bg-muted bg-[url(/images/background.jpg)] bg-cover bg-center px-6 py-10 max-md:min-h-0 max-md:rounded-[28px] max-md:px-4 max-md:py-6"
					id="acceso"
				>
					<AccessCard user={user} />
				</div>
			</section>

			<section
				className={`${wrap} flex flex-col gap-8 pt-14 pb-[88px]`}
				id="como-funciona"
			>
				<SectionHead
					text="De la clase al laboratorio en tres pasos."
					title="Cómo funciona"
				/>
				<div className={grid}>
					{steps.map(({ icon: Icon, title, text }, index) => (
						<Card asChild className="gap-3" key={title}>
							<article>
								<div className="flex size-11 flex-none items-center justify-center rounded-lg bg-accent text-primary-text">
									<Icon aria-hidden="true" size={22} strokeWidth={1.75} />
								</div>
								<p className="mt-1 text-sm text-muted-foreground">
									Paso {index + 1}
								</p>
								<CardTitle as="h3" className="text-[21px]">
									{title}
								</CardTitle>
								<p className="text-pretty text-muted-foreground">{text}</p>
							</article>
						</Card>
					))}
				</div>
			</section>

			<div className="bg-secondary" id="para-quien">
				<section className={`${wrap} flex flex-col gap-8 pt-[72px] pb-20`}>
					<SectionHead
						text="Si tu cuenta tiene más de un rol, ves las vistas juntas en el mismo tablero."
						title="Un tablero para cada rol"
					/>
					<div className={grid}>
						{roles.map(({ title, items }) => (
							<Card asChild className="gap-3.5 px-7 pb-7" key={title}>
								<article>
									<CardTitle as="h3" className="text-primary-text">
										{title}
									</CardTitle>
									<ul className="flex list-disc flex-col gap-2 pl-5">
										{items.map((item) => (
											<li key={item}>{item}</li>
										))}
									</ul>
								</article>
							</Card>
						))}
					</div>
				</section>
			</div>

			<section
				className={`${wrap} flex flex-col gap-8 pt-[72px] pb-[88px]`}
				id="creditos"
			>
				<SectionHead
					text="Conoce a los estudiantes de la Universidad de Sonora que desarrollaron SISLAB en el laboratorio CSI PRO."
					textClassName="max-w-[640px] text-pretty"
					title="Equipo de desarrollo"
				/>
				<div className={grid}>
					{team.map(({ name, role, owl, links }) => (
						<Card
							asChild
							className="items-center gap-3.5 px-6 pt-7 text-center"
							key={name}
						>
							<article>
								<div className="flex size-[104px] flex-none items-center justify-center rounded-full bg-accent">
									<img
										alt=""
										// The black owl would vanish on the dark circle.
										className={cn(
											"h-auto w-16",
											owl === "black" && "dark:invert",
										)}
										height={50}
										src={withBase(`/images/owl-${owl}.png`)}
										width={64}
									/>
								</div>
								<div className="flex flex-col gap-0.5">
									<CardTitle as="h3" className="text-[21px] leading-tight">
										{name}
									</CardTitle>
									<p className="text-muted-foreground">{role}</p>
								</div>
								<div className="mt-1 flex flex-wrap justify-center gap-2.5">
									{links.map(({ icon: Icon, label, href }) => (
										<Button asChild key={label} size="sm" variant="outline">
											<a
												aria-label={`${label} de ${name}`}
												href={href}
												rel="noopener noreferrer"
												target="_blank"
											>
												<Icon aria-hidden="true" size={18} strokeWidth={1.75} />
												{label}
											</a>
										</Button>
									))}
								</div>
							</article>
						</Card>
					))}
				</div>
			</section>
		</main>
	);
}

const wrap = "mx-auto w-full max-w-[1200px] px-8 max-md:px-5";
const grid =
	"grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5";

function SectionHead({
	title,
	text,
	textClassName,
}: {
	title: string;
	text: string;
	textClassName?: string;
}) {
	return (
		<div className="flex flex-col gap-2">
			<h2 className="text-[32px] leading-tight font-bold">{title}</h2>
			<p className={cn("text-[17px] text-muted-foreground", textClassName)}>
				{text}
			</p>
		</div>
	);
}
