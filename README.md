# Upcoming frontend

Responsive React + TypeScript app, built with Vite. Releases, Starred and Friends have accessible client-side routes, keyboard focus handling and mobile layouts. This first slice is the visual/application foundation: live film data and account/social actions are not connected yet. Empty and coming-soon states make that explicit.

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

The first command runs TypeScript, ESLint, three React navigation tests, and the production build. Playwright exercises routes, reloads and horizontal overflow at desktop and mobile sizes against the built preview. It requires the Chromium browser download; Linux CI installs required OS dependencies with `npx playwright install --with-deps chromium`. For sandbox network restrictions, allow the download hosts `cdn.playwright.dev` and `storage.googleapis.com` on the host.

`npm run format` formats source and configuration files. CI runs the checks and browser tests.

## Production build

```bash
npm run build
```

The output is `dist/`. The sibling Express backend serves that directory by default, keeping frontend and API on one hostname. See its README for starting and configuring the production build. `npm run preview` is a local build preview, not the home-server deployment.

Fonts (DM Sans and Manrope) are bundled locally through Fontsource. Icons use Lucide. The UI makes no external font requests. Film data attribution will be added when the live TMDB calendar is connected, following the backend's validation report.
