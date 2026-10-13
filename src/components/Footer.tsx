import { useRouterState } from "@tanstack/react-router";
import { SISLAB_TIME_ZONE } from "#/lib/academic-period.ts";
import { withBase } from "#/lib/base-path.ts";

const navLink =
	"inline-flex min-h-11 items-center text-[15px] text-muted-foreground no-underline hover:text-primary-text";

export default function Footer() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	if (pathname.startsWith("/app")) return null;
	// The year in Hermosillo, so the server and a browser in another zone render the same text.
	const year = new Intl.DateTimeFormat("es-MX", {
		timeZone: SISLAB_TIME_ZONE,
		year: "numeric",
	}).format(new Date());
	return (
		<footer className="border-t bg-secondary" id="acerca">
			<div className="mx-auto w-full max-w-[1200px] px-8 max-md:px-5 flex flex-col gap-8 pt-14 pb-7">
				<div className="flex flex-wrap items-start justify-between gap-x-16 gap-y-6">
					<div className="flex max-w-[440px] flex-[1_1_320px] flex-col gap-4">
						<div className="flex items-center gap-3">
							<img
								alt=""
								className="size-10"
								src={withBase("/images/logo.svg")}
							/>
							<span className="grid leading-[1.1]">
								<strong className="text-[28px] tracking-[0.02em]">
									SISLAB
								</strong>
								<span className="mt-[3px] text-[13px] text-muted-foreground">
									Sistema de Laboratorios
								</span>
							</span>
						</div>
						<p className="text-pretty text-muted-foreground">
							SISLAB es un sistema de laboratorios que desarrollaron estudiantes
							de la Universidad de Sonora, miembros del laboratorio{" "}
							<strong className="text-csipro-purple">CSI PRO</strong>.
						</p>
					</div>
					<nav
						aria-label="Pie de página"
						className="flex flex-wrap items-center gap-x-7"
					>
						<a className={navLink} href={withBase("/#como-funciona")}>
							Cómo funciona
						</a>
						<a className={navLink} href={withBase("/#para-quien")}>
							Para quién
						</a>
						<a className={navLink} href={withBase("/#creditos")}>
							Créditos
						</a>
						<a className={navLink} href={withBase("/#acceso")}>
							Ingresar
						</a>
					</nav>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 border-t pt-6">
					<span className="text-sm text-muted-foreground">
						© {year} CSI PRO · Universidad de Sonora
					</span>
					<div className="ml-auto flex flex-wrap items-center justify-end gap-x-9 gap-y-5">
						<a
							aria-label="CSI PRO (abre csipro.isi.unison.mx)"
							className="flex items-center gap-3.5 text-foreground no-underline hover:text-foreground"
							href="https://csipro.isi.unison.mx/"
							rel="noopener noreferrer"
							target="_blank"
						>
							<span className="flex size-[60px] flex-none items-center justify-center rounded-[14px] bg-csipro-tile">
								<img
									alt=""
									className="h-auto w-10"
									src={withBase("/csipro.svg")}
								/>
							</span>
							<span className="text-[30px] leading-none font-bold tracking-[0.01em]">
								CSI PRO
							</span>
						</a>
						<a
							aria-label="UNISON, Universidad de Sonora (abre unison.mx)"
							className="inline-flex min-h-11 items-center"
							href="https://unison.mx"
							rel="noopener noreferrer"
							target="_blank"
						>
							<img
								alt=""
								className="h-11 w-auto dark:brightness-0 dark:invert"
								src={withBase("/images/unison.png")}
							/>
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
