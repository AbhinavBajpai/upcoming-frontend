import { test, expect } from "@playwright/test";
import { calendarFixture } from "../test/fixtures/calendar";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-05T12:00:00Z"));
  await page.route("https://image.tmdb.org/**", (route) => route.abort());
  await page.route("https://www.themoviedb.org/assets/**", (route) =>
    route.abort(),
  );
  await page.route("**/api/releases?*", (route) => {
    const month = new URL(route.request().url()).searchParams.get("month")!;
    return route.fulfill({ json: calendarFixture(month) });
  });
});

test("current date jump, readable past releases and title filtering", async ({
  page,
}) => {
  await page.goto("/releases");
  await expect(page.getByRole("heading", { name: "Nebula" })).toBeVisible();
  await expect(
    page.locator('[data-release-date="2026-09-05"]'),
  ).toBeInViewport();
  await expect(page.locator('[data-release-date="2026-09-01"]')).toHaveClass(
    /release-day-past/,
  );
  await page.getByRole("searchbox").fill("nEbUlA");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear title filter" }).click();
  await expect(page.getByRole("article")).toHaveCount(25);
});

test("month/filter/scroll survive a tab switch", async ({ page }) => {
  await page.goto("/releases");
  await expect(page.getByRole("heading", { name: "Nebula" })).toBeVisible();
  await expect(
    page.locator('[data-release-date="2026-09-05"]'),
  ).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(500);
  await page.getByRole("link", { name: "Friends", exact: true }).click();
  await page.getByRole("link", { name: "Releases", exact: true }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(500);
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("heading", { name: "The Devils" })).toBeVisible();
  await page.getByRole("searchbox").fill("devils");
  await page.getByRole("link", { name: "Starred", exact: true }).click();
  await page.getByRole("link", { name: "Releases", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "October 2026" }),
  ).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveValue("devils");
});

test("revivals, empty months and supported boundaries", async ({ page }) => {
  await page.goto("/releases");
  await expect(page.getByRole("heading", { name: "Nebula" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Previous month" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("heading", { name: "The Devils" })).toBeVisible();
  await expect(page.getByText(/Theatrical revival/)).toBeVisible();
  await expect(page.locator(".poster img")).toHaveCount(0);
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(
    page.getByText("No releases listed for this month."),
  ).toBeVisible();
  for (const label of [
    "December 2026",
    "January 2027",
    "February 2027",
    "March 2027",
  ]) {
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(page.getByRole("heading", { name: label })).toBeVisible();
    await expect(
      page.getByText("No releases listed for this month."),
    ).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Next month" })).toBeDisabled();
  await page.getByRole("button", { name: "This month" }).click();
  await expect(page.getByRole("heading", { name: "Nebula" })).toBeVisible();
});

test("failure and retry are distinct from an empty calendar", async ({
  page,
}) => {
  let failed = false;
  await page.route("**/api/releases?*", async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({ status: 503, json: {} });
    } else await route.fulfill({ json: calendarFixture() });
  });
  await page.goto("/releases");
  await expect(page.getByRole("alert")).toContainText("couldn’t load");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Nebula" })).toBeVisible();
});

test("calendar screenshot and narrow-layout check", async ({ page }, info) => {
  await page.goto("/releases");
  await expect(page.getByRole("heading", { name: "Nebula" })).toBeVisible();
  await expect(
    page.locator('[data-release-date="2026-09-05"]'),
  ).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("calendar.png"),
    fullPage: false,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
