# Upcoming frontend

Responsive React + TypeScript app, built with Vite. Releases, Starred and Friends have accessible client-side routes, keyboard focus handling and mobile layouts. The release calendar loads live catalogue data from the backend. Account and social actions remain coming-soon states.

## Run the app with Docker

From the sibling backend repository:

```bash
docker compose up --build -d --wait
```

Open **http://localhost:3000**. The multi-stage build compiles this frontend and the backend; Express serves the frontend and API from one container, with PostgreSQL in another. No host Node installation or Vite server is required. Use `docker compose stop` from the backend to stop the stack without removing database data.

## Development with live reload

Use Node.js 22.22.1 (`nvm use`). Keep `upcoming-backend` beside this directory and install dependencies with `npm ci` in both repos.

From the backend directory, start the database, migrations, API and frontend:

```bash
npm run dev:all
```

Open `http://localhost:5173`. To run just this app, use `npm run dev`. Vite proxies `/api` to `http://127.0.0.1:3000`; set `API_PROXY_TARGET` in a local `.env` to change that target. `.env.example` documents the setting. Never put a TMDB token or other server secret here.

When running inside the current development sandbox, publish the frontend port from the host if needed:

```bash
sbx ports codex-upcoming --publish 5173:5173/tcp
```

## Checks

```bash
npm run check
npx playwright install chromium
npm run test:e2e
```

The first command runs TypeScript, ESLint, React navigation and calendar tests, and the production build. Playwright exercises routes, calendar navigation, filtering, scroll restoration, retry states and horizontal overflow at desktop and mobile sizes against the built preview. It requires the Chromium browser download; Linux CI installs required OS dependencies with `npx playwright install --with-deps chromium`. For sandbox network restrictions, allow the download hosts `cdn.playwright.dev` and `storage.googleapis.com` on the host.

`npm run format` formats source and configuration files. CI runs the checks and browser tests.

## Production build

```bash
npm run build
```

The output is `dist/`. The sibling Express backend serves that directory by default, keeping frontend and API on one hostname. See its README for starting and configuring the production build. `npm run preview` is a local build preview, not the home-server deployment.

Fonts (DM Sans and Manrope) are bundled locally through Fontsource. Icons use Lucide. The UI makes no external font requests. Film posters load from TMDB with a missing-image fallback. The About and credits footer includes TMDB attribution and its approved logo.

## Release calendar

Requires the backend monthly API. From the backend directory, populate the database with `docker compose --profile tools run --build --rm -T sync` using the token in its `.env`. Rebuild the app after updating either repository.

Months group GB theatrical films by release date, including revivals. The current month starts at the nearest release on or after today in UK time; earlier dates are subdued. Title filtering stays within the selected month. Switching tabs retains the month, filter and scroll position for the current page session. Loading, retry, unrefreshed, empty and no-match states are distinct. Supported month bounds come from the API.

Browser tests use deterministic API fixtures and deliberately unavailable remote images; they do not require a TMDB token. CI retains desktop/mobile screenshots and failure traces for seven days.
