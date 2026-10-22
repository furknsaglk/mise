// Copies MapLibre GL's web worker into public/vendor/ so it is served from our own origin.
//
// MapLibre 6 loads its worker from a separate ES module file that it looks for next to its own
// bundle. After Next.js bundles the library that file is no longer there, so the app tells
// MapLibre where to find it with setWorkerUrl() (see src/components/map/VectorBasemap.js).
// Runs automatically before `npm run dev` and `npm run build` (predev / prebuild), so the copy
// always matches the installed maplibre-gl version.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("maplibre-gl/package.json", { paths: [root] }));
const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));

const source = join(pkgDir, "dist", "maplibre-gl-worker.mjs");
const targetDir = join(root, "public", "vendor");
mkdirSync(targetDir, { recursive: true });
copyFileSync(source, join(targetDir, "maplibre-gl-worker.mjs"));
console.log(`maplibre-gl ${version}: worker copied to public/vendor/maplibre-gl-worker.mjs`);
