// `npm run build:demo` sets MISE_STATIC_EXPORT to produce the keyless static demo for GitHub Pages
// (see scripts/build-demo.mjs). The regular build is unaffected.
const staticExport = process.env.MISE_STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(staticExport && {
    output: "export",
    basePath,
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
