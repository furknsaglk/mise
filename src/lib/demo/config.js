// Static demo build (GitHub Pages): no server, no API keys.
// Enabled at build time by scripts/build-demo.mjs (NEXT_PUBLIC_MISE_DEMO=1).
//  • Venues are FICTIONAL, generated around the searched place (src/lib/demo/venues.js)
//  • Place search, weather, walking routes and the map are real (keyless, CORS-enabled services
//    called directly from the browser)
export const IS_DEMO = process.env.NEXT_PUBLIC_MISE_DEMO === "1";
