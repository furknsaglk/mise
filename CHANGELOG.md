# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/furknsaglk/mise/releases/tag/v0.1.0
