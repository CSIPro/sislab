import { useRouterState } from "@tanstack/react-router";

export default function Footer() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	if (pathname.startsWith("/app")) return null;
	return (
		<footer className="bg-card" id="acerca">
			<div className="mx-auto w-full max-w-[1200px] px-8 max-md:px-5 flex flex-wrap items-center gap-6 pt-12 pb-14">
				<svg
					aria-hidden="true"
					className="flex-none text-muted-foreground"
					fill="none"
					height="48"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					viewBox="0 0 48 48"
					width="48"
				>
					<circle cx="8" cy="24" r="3.5" />
					<circle cx="40" cy="24" r="3.5" />
					<circle cx="24" cy="8" r="3.5" />
					<circle cx="24" cy="40" r="3.5" />
					<path d="M11 22 22 10.5M26 10.5 37 22M37 26 26 37.5M22 37.5 11 26" />
				</svg>
				<p className="max-w-[640px] flex-[1_1_360px] text-pretty text-muted-foreground">
					SISLAB es un sistema de laboratorios desarrollado por estudiantes de
					la Universidad de Sonora, miembros del laboratorio{" "}
					<span className="font-bold text-csipro-purple">CSI PRO</span>.
				</p>
			</div>
		</footer>
	);
}
