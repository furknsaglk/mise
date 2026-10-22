// Prefix for static files when the app is served from a sub-path
// (GitHub Pages project site: https://<user>.github.io/mise/ → "/mise").
// next/link and Next's own assets handle the base path automatically; plain <img src> and
// hand-built URLs (e.g. the MapLibre worker) go through withBase().
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const withBase = (path) => (typeof path === "string" && path.startsWith("/") ? `${BASE_PATH}${path}` : path);
