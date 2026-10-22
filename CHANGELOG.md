# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-10-22

### Added

- Keyless live demo on GitHub Pages (`npm run build:demo`, `.github/workflows/pages.yml`): a static export that
  generates clearly labeled fictional venues in the browser and calls the free services (Photon, Open-Meteo, OSRM,
  OpenFreeMap) directly. Venue positions are kept on land using Open-Meteo elevation data.
- In-app demo notice and "fictional demo venue" labels on cards and map popups.

### Changed

- Photon, Open-Meteo and OSRM clients moved to `src/lib/services/`, shared by the API routes and the demo.
- The browser gets all data through `src/lib/dataClient.js`; asset URLs respect an optional base path.
- CI also builds the static demo.

## [0.1.1] - 2026-10-22

### Security

- Upgrade `maplibre-gl` from 5.24 to 6.15 to fix a critical XSS sanitizer bypass in `DOM.sanitize()`
  (affects `maplibre-gl` ≤ 6.4.0; reported by Dependabot).

### Changed

- MapLibre 6 loads its web worker from a separate module: `scripts/copy-maplibre-worker.mjs` now copies it to
  `public/vendor/` before `dev` and `build`, and the app registers it with `setWorkerUrl()`.
- `LICENSE` now contains the unmodified MIT text so GitHub detects the license.

## [0.1.0] - 2026-10-22

### Added

- Discover screen: worldwide place search, map pin, venue list grouped by course, filters and sorting.
- Mise score: Bayesian combination of platform ratings with a *Verified* badge.
- Day menu planner: dynamic-programming itinerary optimization with pinning, alternatives, real walking routes,
  lateness/free-time notes and weekday-aware opening hours.
- Context layer: hourly weather, sunset-aware terraces and an estimated busyness model.
- Map popups with scores, descriptions and reviews.
- Integrations: Google Maps route, Apple Maps / Citymapper / Uber links, `.ics` export with reminders,
  Google Calendar links, shareable PNG menu card and text sharing.
- Data sources: Google Places API (New), Foursquare Places API, OpenStreetMap (Overpass / Photon), OSRM, Open-Meteo.
- Quota-aware fallback with Google Places UI Kit cards for matched venues (only place IDs are stored).
- Cost safeguards: per-IP rate limiting, in-session request sharing, documented Google Cloud quota setup.
- PWA manifest, responsive layout and dark mode.

[0.2.0]: https://github.com/furknsaglk/mise/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/furknsaglk/mise/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/furknsaglk/mise/releases/tag/v0.1.0
