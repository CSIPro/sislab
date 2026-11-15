import { useSyncExternalStore } from "react";

type ColorScheme = "light" | "dark";

function subscribe(onChange: () => void) {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});
	return () => observer.disconnect();
}

/** The theme the page shows now. The theme toggle flips the `dark` class on the root element, and this hook follows it. */
export function useColorScheme(): ColorScheme {
	return useSyncExternalStore(
		subscribe,
		() =>
			document.documentElement.classList.contains("dark") ? "dark" : "light",
		() => "light",
	);
}
