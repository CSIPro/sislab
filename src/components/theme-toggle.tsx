import { Moon, Sun } from "lucide-react";

/**
 * The moon in the light theme and the sun in the dark one. CSS picks which
 * one shows, because the server does not know the theme the browser will use.
 */
export function ThemeIcon() {
	return (
		<>
			<Moon aria-hidden="true" className="dark:hidden" strokeWidth={1.75} />
			<Sun
				aria-hidden="true"
				className="hidden dark:block"
				strokeWidth={1.75}
			/>
		</>
	);
}

/** "Tema oscuro" in the light theme and "Tema claro" in the dark one: the theme the button switches to. */
export function ThemeLabel() {
	return (
		<span>
			<span className="dark:hidden">Tema oscuro</span>
			<span className="hidden dark:inline">Tema claro</span>
		</span>
	);
}
