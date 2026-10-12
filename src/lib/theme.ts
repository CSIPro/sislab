const storageKey = "sislab-theme";

/**
 * Runs in the document head before the first paint, so the page never flashes
 * the wrong theme. A saved choice wins, otherwise the system setting decides.
 * It also follows a change made in another tab.
 */
export const themeInitScript = `(function(){var K='${storageKey}',d=document.documentElement;function set(t){d.classList.toggle('dark',t==='dark');d.style.colorScheme=t}var t=null;try{t=localStorage.getItem(K)}catch(e){}if(t!=='dark'&&t!=='light'){try{t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){t='light'}}set(t);addEventListener('storage',function(e){if(e.key===K&&(e.newValue==='dark'||e.newValue==='light'))set(e.newValue)})})();`;

/** Switches between the light and dark themes and remembers the choice on this device. */
export function toggleTheme() {
	const root = document.documentElement;
	const next = root.classList.contains("dark") ? "light" : "dark";
	root.classList.toggle("dark", next === "dark");
	root.style.colorScheme = next;
	try {
		localStorage.setItem(storageKey, next);
	} catch {
		// Private windows can refuse storage. The theme still changes for this visit.
	}
}
