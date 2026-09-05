import { test, expect } from "@playwright/test";
import { calendarFixture } from "../test/fixtures/calendar";
import type { StarredFilm } from "../src/stars/api";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-05T12:00:00Z"));
  await page.route("https://image.tmdb.org/**", (route) => route.abort());
  await page.route("**/api/releases?*", (route) =>
    route.fulfill({
      json: calendarFixture(
        new URL(route.request().url()).searchParams.get("month")!,
      ),
    }),
  );
});
test("signed-out star action offers sign-in and retains the return route", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto("/releases");
  await page
    .getByRole("button", { name: "Want to watch Nebula", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Freleases$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
test("shared stars, failure rollback, retry, and released/TBC sections", async ({
  page,
}, info) => {
  const nebula = calendarFixture().films.find((f) => f.title === "Nebula")!;
  const old = calendarFixture().films[0]!;
  let films: StarredFilm[] = [
    { ...old, section: "released" },
    {
      ...nebula,
      id: "unknown",
      title: "Untitled Adventure",
      releaseDate: null,
      section: "tbc",
    },
  ];
  let failSave = false;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: { user: { id: "alice", displayName: "Cinema Friend" } },
    }),
  );
  await page.route("**/api/stars", (route) =>
    route.fulfill({ json: { today: "2026-09-05", films } }),
  );
  await page.route("**/api/stars/*", async (route) => {
    if (failSave) return route.fulfill({ status: 503, json: {} });
    const starred = route.request().method() === "PUT";
    films = starred
      ? [...films, { ...nebula, section: "upcoming" }]
      : films.filter((f) => f.id !== nebula.id);
    await route.fulfill({ json: { filmId: nebula.id, starred } });
  });
  await page.goto("/releases");
  await page
    .getByRole("button", { name: "Want to watch Nebula", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "On your watchlist: Nebula (remove)",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    page.getByRole("article", { name: "Nebula", exact: true }),
  ).toHaveClass(/film-card-starred/);
  await page.getByRole("link", { name: "Starred", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nebula", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Already released", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Date to be confirmed", exact: true }),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({
    path: info.outputPath("starred-sections.png"),
    fullPage: true,
  });
  failSave = true;
  await page
    .getByRole("button", {
      name: "On your watchlist: Nebula (remove)",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("Nebula");
  await expect(
    page.getByRole("button", {
      name: "On your watchlist: Nebula (remove)",
      exact: true,
    }),
  ).toBeEnabled();
  failSave = false;
  await page.getByRole("button", { name: "Refresh stars" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "On your watchlist: Nebula (remove)",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nebula", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Releases", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Want to watch Nebula", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("article", { name: "Nebula", exact: true }),
  ).not.toHaveClass(/film-card-starred/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Want to watch Nebula", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
