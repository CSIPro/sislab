import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// The legacy SISLAB still answers at the root of the host, so this app lives under /v2.
// TanStack Start derives the router basepath and the server function URLs from Vite's `base`.
// Nitro needs the same value as `baseURL` to serve the client files under it.
const base = "/v2/";

const config = defineConfig({
	base,
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		tailwindcss(),
		tanstackStart(),
		nitro({ baseURL: base }),
		viteReact(),
	],
	server: {
		allowedHosts: ["adelyn-unterrifying-motionlessly.ngrok-free.dev"],
	},
});

export default config;
