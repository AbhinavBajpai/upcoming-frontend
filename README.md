# Upcoming frontend

Responsive React + TypeScript app, built with Vite. Releases, Watch list and Friends have accessible client-side routes, keyboard focus handling and mobile layouts. The release calendar loads live catalogue data from the backend. Email/password accounts, personal watch lists and mutual friendships are available.

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

Fonts (DM Sans, Manrope and Share Tech Mono) are bundled locally through Fontsource. Icons use Lucide. The UI makes no external font requests. Film posters load from TMDB with a missing-image fallback. The About and credits footer includes TMDB attribution and its approved logo.

## Release calendar

Requires the backend monthly API. From the backend directory, populate the database with `docker compose --profile tools run --build --rm -T sync` using the token in its `.env`. Rebuild the app after updating either repository.

Months group GB theatrical films by release date, including revivals. The current month starts at the nearest release on or after today in UK time; ticket colour reflects whether the film is on your watch list. Title filtering stays within the selected month. Switching tabs retains the month, filter and scroll position for the current page session. Loading, retry, unrefreshed, empty and no-match states are distinct. Supported month bounds come from the API.

Browser tests use deterministic API fixtures and deliberately unavailable remote images; they do not require a TMDB token. CI retains desktop/mobile screenshots and failure traces for seven days.

Film cards link to IMDb and Letterboxd in new tabs. IMDb links use IDs stored by the backend sync; after upgrading, rebuild the app and rerun the sync command above to populate them. If no IMDb ID is available, the card shows an unavailable label. Letterboxd uses its [documented TMDB-ID redirect](https://letterboxd.com/about/film-data/) to reach the matching film without guessing a title slug.

## Accounts

Registration, email verification, sign-in, password reset and account settings are available. The account screen lets you update your display name, change password and sign out other sessions. Use the backend accounts branch/version with this frontend.

For local Docker testing, rebuild from the sibling backend and open http://localhost:3000. Captured verification/reset emails appear at http://localhost:8025. Follow the email link before signing in. No real email provider is needed locally; do not publish the mail inbox through the tunnel.

Auth requests use same-origin JSON endpoints; session cookies remain HttpOnly. Reset tokens are removed from the address bar once the form loads, so reloading the form requires reopening the email link. The return route after sign-in is restricted to app tabs. All authentication pages avoid remote attribution images and use the backend's no-referrer policy.

CI also runs the full account lifecycle against a pinned backend commit, PostgreSQL and Mailpit at desktop/mobile sizes. Update the backend revision in `.github/workflows/ci.yml` when intentionally changing the account contract. Locally set `E2E_BACKEND_PATH` to the sibling backend and `DATABASE_URL` to an isolated `upcoming_test` database, with Mailpit on localhost:8025/1025, before `npm run test:e2e`. The backend must already be built. Do not point browser tests at a personal database.

Star buttons on film cards require a verified account and share state with the
Watch list tab. Saves update immediately, disable repeated clicks while pending,
and roll back with a visible error if the request fails. Reloading, switching
app tabs, or returning focus to the browser refreshes the list from the server.
Nothing is stored in localStorage; switching accounts discards the old list.

The Watch list tab groups dated films by month, with older films still accessible
and a separate Date TBC view for films with no known UK wide theatrical date.
Dates come from the same catalogue as the release calendar, so postponements do
not remove stars.

Browser CI covers real account creation and star persistence using PostgreSQL,
Mailpit, and a fictional catalogue fixture in `upcoming_test`. Mocked browser
scenarios additionally exercise request failure, monthly navigation and Date TBC.

The Friends tab supports profile-link sharing, incoming/sent requests and accepted
connections. `/friends/<userId>` opens a profile and preserves that route through
sign-in. Only an accepted friend's profile loads their watch list; buttons on
that list add/remove films from **your own** watch list.

Friend data is scoped to the current account and profile. Navigation, refocusing
the browser and permission refreshes reload it. Losing focus retains confirmed
friend data, and refocusing refreshes it in the background. Failed or unauthorized reads never fall back to a cached private
list. Actions refresh the server state, including crossed requests and conflicts.
Removing a friend requires an inline confirmation explaining that access ends in
both directions.

To test UP-10 and UP-11 together, use backend branch `feat/mutual-friendships`
and frontend branch `feat/friends-screens`, then rebuild Compose from the backend.
Use two verified accounts in separate browser profiles (or a private window).
Open Friends, copy one account's profile link, open it as the other account and
send a request. Accept it in the first account, view each other's lists, then
remove the connection and revisit the profile to check access is gone.

Film cards now show which of **your accepted friends** want to watch a film, on
Releases, your watch list and friend watch lists. One or two names appear directly;
larger groups use a keyboard-accessible disclosure listing every name. Names link
to the respective friend profiles. A solid plum panel with white text makes this
shared interest prominent on each card.

Each active list requests interest in batches of at most 100 unique film IDs,
never one request per card. Data is isolated by signed-in account and list, retained
across focus changes, and invalidated around star and friendship changes. Failed or
unauthorized batches never leave old names visible; a list-level retry is available.
Changes made in another browser session become visible when you return focus to
the app or revisit the list.


### Monthly browsing (UP-16, UP-17, UP-18)

Personal and accepted friends’ watch lists open on the current UK month and use
shared Previous / This month / Next controls. Dated films are grouped chronologically;
older months remain accessible through the month selector. Empty intervening months
have an explicit empty state. Date TBC retains films with no known release date.
Month navigation is client-side over the existing watch-list response; it does not
remove saved films or require a new backend endpoint.

On mobile (up to 560px), Releases and monthly watch lists have a date rail beside
the film groups. All days remain visible; grey dates have no films in the current
view. Drag or tap to jump to the nearest populated date (ties choose the earlier
date). Scrolling the film list updates the highlight. The rail is also a single
keyboard-accessible slider: arrows move between populated dates, Home/End jump to
the first/last date. It hides outside the list and on other app tabs. Date TBC has
no date rail. On short screens the ticks are compact; the whole rail is the drag
surface rather than requiring precise taps on individual ticks.

IMDb and Letterboxd links use bundled SVG logos with accessible film/service names,
new-tab hints and the original destinations. Source attribution is in
`public/brands/README.md`.

To test these changes, use backend `main` and frontend `feat/monthly-browsing`, then
run `docker compose up --build -d --wait` from the backend repository.


### Cross-month suggestions and page navigation (UP-19, UP-20)

Filtering Releases also suggests up to 20 matching films in other supported months.
Search is debounced by 300 ms; a suggestion failure has its own retry and does not
interrupt local filtering. Selecting a suggestion preserves the query, opens its
month and focuses the matching ticket after the results settle. Month, query and
target film are carried in the URL, so reload and browser Back retain the search.
Bare app-tab links continue to preserve the mounted calendar’s selection.

The Releases, Watch list and Friends pages omit redundant page-title headings.
The navigation exposes `aria-current`, the main landmark names the active page,
document titles identify the page, and route changes focus the main content.
Month, list and film headings remain available for heading navigation. Account and
authentication form headings remain because no main tab identifies those screens.

To test UP-19 and UP-20, use `feat/cross-month-search` in both repositories and
rebuild Compose from the backend. Search for a known film in a different month,
follow its suggestion, reload, then use Back. Verify the query/month are restored.


### Beta browsing refinements (UP-23–26)

The Friends tab shows an incoming-request count. It refreshes on focus, friendship
changes and every minute while the document is visible. Confirmed counts remain
visible during refetches; outgoing requests are not notifications.

On phones, Releases keeps its month heading and controls below the sticky header.
Date jumps leave room for these controls. Ticket posters are 110×165 pixels across screen sizes.

Both personal and friends’ watch lists offer **All months**: films dated from the
start of the previous UK calendar month onward, including all future dates.
Older films remain available in monthly view. **Date TBC** stays separate, and
returning to **By month** restores the selected month.


Watch-list controls now match Releases: the month heading and Previous / This month /
Next controls are followed by one row containing **All**, **TBC** and the month
dropdown. On mobile, the complete control block sticks below the header on both
personal and friends’ lists. Date jumps allow for its height. Selecting a month
or using the month navigation leaves All/TBC; pressing the active All or TBC
button again returns to the preceding view.
