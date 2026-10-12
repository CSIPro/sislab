// Vite's `base` without its trailing slash: "/v2" while the legacy SISLAB keeps the root of the host.
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Prefixes a root-relative path with the base path. Use it for raw anchors, files in
 * `public` and full page loads. `Link` and `redirect` add the base on their own.
 */
export function withBase(path: `/${string}`): string {
	return `${basePath}${path}`;
}
