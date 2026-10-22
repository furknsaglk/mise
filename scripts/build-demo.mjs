// Builds the keyless static demo (the version published on GitHub Pages) into out/.
//
// The demo generates fictional venues in the browser and calls the free, keyless services
// (Photon, Open-Meteo, OSRM, OpenFreeMap) directly, so it needs no server and no API keys.
// A static export can't contain API routes, so src/app/api is moved aside for the duration of the
// build (a folder starting with "_" is ignored by the App Router) and always restored afterwards.
//
// Usage: npm run build:demo            (base path /mise, for https://<user>.github.io/mise/)
//        DEMO_BASE_PATH= npm run build:demo   (served from the domain root)
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const api = join(root, "src", "app", "api");
const parked = join(root, "src", "app", "_api");
const basePath = process.env.DEMO_BASE_PATH ?? "/mise";

if (existsSync(parked)) {
  console.error("src/app/_api already exists — restore it to src/app/api before building the demo.");
  process.exit(1);
}

const run = (args, env) => {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run([join(root, "scripts", "copy-maplibre-worker.mjs")]);

renameSync(api, parked);
let status = 0;
try {
  const result = spawnSync(process.execPath, [join(root, "node_modules", "next", "dist", "bin", "next"), "build"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      MISE_STATIC_EXPORT: "1",
      NEXT_PUBLIC_MISE_DEMO: "1",
      NEXT_PUBLIC_BASE_PATH: basePath,
      // Keys in .env.local must never end up in the public demo. Next.js only fills in variables
      // that are unset or empty, so a non-empty placeholder keeps the real values out.
      NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: "off",
      GOOGLE_PLACES_API_KEY: "off",
      FOURSQUARE_API_KEY: "off",
    },
  });
  status = result.status ?? 1;
} finally {
  renameSync(parked, api);
}
if (status !== 0) process.exit(status);

// The client prefetches route segments as flat files ("plan/__next.plan.__PAGE__.txt"), but the
// export writes them into folders ("plan/__next.plan/__PAGE__.txt"). A static host has no rewrites,
// so add the flat copies next to them.
const out = join(root, "out");
const flatten = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("__next.")) {
      for (const file of readdirSync(path, { recursive: true, withFileTypes: true })) {
        if (!file.isFile()) continue;
        const nested = relative(path, join(file.parentPath, file.name)).split(sep);
        copyFileSync(join(file.parentPath, file.name), join(dir, [entry.name, ...nested].join(".")));
      }
    } else if (entry.name !== "_next") {
      flatten(path);
    }
  }
};
flatten(out);

// GitHub Pages: serve folders starting with "_" (such as _next/) as-is
writeFileSync(join(out, ".nojekyll"), "");
console.log(`Demo built into out/ (base path "${basePath || "/"}").`);
