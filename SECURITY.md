# Security Policy

## Supported versions

Only the latest version on the `main` branch receives fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private
**Security → Report a vulnerability** form on this repository and include:

- the affected file, page or API route,
- steps to reproduce,
- the potential impact (e.g. data exposure, unexpected API cost, XSS).

You should receive an acknowledgement within a few days. Please give the maintainer a reasonable amount of time to
release a fix before disclosing the issue publicly.

## API keys

- **Never** put secret keys (Google, Foursquare) in issues, pull requests, commits or screenshots. Secret keys belong
  only in `.env.local` (git-ignored) and in the hosting provider's encrypted environment variables.
- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` is **public by design** — it is embedded in the page bundle. It must be
  protected in Google Cloud by an **API restriction**, an **HTTP referrer (website) restriction** and a **daily quota**.
  Do not deploy it without these restrictions.
- **If a key leaks:** revoke it immediately in the Google Cloud Console / Foursquare developer dashboard, create a new
  one and update `.env.local` and the hosting environment. Removing a key from git history is not enough — it must be
  revoked.

## Security-relevant design

- API routes under `src/app/api/*` validate their inputs; `/api/places` and `/api/photo` are rate-limited per IP
  (best effort in a serverless environment).
- `/api/photo` only accepts Google photo resource names of the form `places/…/photos/…` (prevents SSRF).
- Website URLs from external sources are sanitized by `src/lib/url.js` (`http`/`https` only).
- Map marker HTML contains only numbers and the app's own CSS variables — never venue names (prevents XSS).
