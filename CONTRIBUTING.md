# Contributing to Mise

Thanks for taking the time to contribute!

## Before you start

- For larger changes, please **open an issue first** so we can discuss the approach.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Report security problems privately as described in [SECURITY.md](SECURITY.md), not as public issues.

## Development setup

```bash
npm install
cp .env.example .env.local   # API keys are optional
npm run dev                  # http://localhost:3000
```

Make sure the production build passes before opening a pull request — CI runs the same check:

```bash
npm run build
```

## Guidelines

- **No secrets.** Never commit `.env.local`, API keys, or screenshots/logs that contain them.
- **Respect data terms.** Do **not** cache or store Google Places content (names, ratings, reviews, hours,
  photos…); only place IDs may be stored. Follow the Foursquare and OpenStreetMap terms and keep attributions.
- **Mind the cost.** If a change adds paid API calls or increases their number, state the request count and quota
  impact in the pull request.
- **No fabricated data.** Don't add sample data with invented ratings or reviews for real businesses. If you need
  fixtures, use clearly fictional venue names.
- **Third-party content.** When adding images or fonts, record their license and source in
  [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and, for photos, in `src/lib/data/photoCredits.json`.
- **Language.** Code, comments, commit messages and documentation are in English. User-facing UI text is Turkish.
- **Style.** Match the surrounding code: CSS Modules, design tokens from `src/styles/tokens.css`, short explanatory
  comments, and the settings in [`.editorconfig`](.editorconfig).
- **UI changes.** Check phone width (~400 px) and dark mode.

## Commit messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) style:

```
feat(planner): suggest an earlier time when a venue is busy
fix(calendar): fold .ics lines by UTF-8 octets
docs: explain the Google quota setup
```

## Pull requests

- Keep pull requests focused on one change.
- Fill in the pull request template, including the paid-API impact.
- Link the related issue (e.g. `Closes #12`).
