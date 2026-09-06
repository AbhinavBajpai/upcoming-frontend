import { test, expect } from "@playwright/test";
import { calendarFixture } from "../test/fixtures/calendar";
import { currentUkMonth, offsetMonth } from "../src/calendar/api";

test("suggestions navigate to a matching film and Back restores month/query", async ({
  page,
}, info) => {
  await page.clock.setFixedTime(new Date("2026-09-05T12:00:00Z"));
  await page.route("**/api/releases?*", (route) =>
    route.fulfill({
      json: calendarFixture(
        new URL(route.request().url()).searchParams.get("month")!,
      ),
    }),
  );
  await page.route("**/api/releases/search?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const query = params.get("q")!,
      month = params.get("month")!;
    return route.fulfill({
      json: {
        query,
        month,
        hasMore: false,
        matches:
          month !== "2026-10" && "the devils".includes(query.toLowerCase())
            ? [
                {
                  filmId: "film-31767",
                  title: "The Devils",
                  month: "2026-10",
                  releaseDate: "2026-10-30",
                },
              ]
            : [],
      },
    });
  });
  await page.goto("/releases");
  await page.getByRole("searchbox").fill("devils");
  await expect(
    page.getByText("No titles match your search.", { exact: true }),
  ).toBeVisible();
  const suggestions = page.getByRole("region", {
    name: "Matches in other months",
  });
  await expect(
    suggestions.getByRole("link", { name: /The Devils/ }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("other-month-suggestions.png"),
  });
  await suggestions.getByRole("link", { name: /The Devils/ }).click();
  const film = page.getByRole("article", { name: "The Devils", exact: true });
  await expect(film).toBeInViewport();
  await expect(film).toBeFocused();
  await expect(page.getByRole("searchbox")).toHaveValue("devils");
  await expect(page).toHaveURL(/month=2026-10&q=devils&film=film-31767/);
  await page.reload();
  await expect(film).toBeInViewport();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "September 2026", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveValue("devils");
  // Suggestions also appear alongside matches in the current month.
  await page.getByRole("searchbox").fill("the");
  await expect(page.getByRole("article")).toHaveCount(14);
  await expect(
    suggestions.getByRole("link", { name: /The Devils/ }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("missing");
  await expect(suggestions).toHaveCount(0);
  await page.getByRole("button", { name: "Clear title filter" }).click();
  await expect(suggestions).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(25);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("failed suggestions leave the current month filter working and can retry", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-09-05T12:00:00Z"));
  await page.route("**/api/releases?*", (route) =>
    route.fulfill({ json: calendarFixture() }),
  );
  let fail = true;
  await page.route("**/api/releases/search?*", (route) =>
    fail
      ? route.fulfill({ status: 503 })
      : route.fulfill({
          json: {
            query: "Nebula",
            month: "2026-09",
            matches: [],
            hasMore: false,
          },
        }),
  );
  await page.goto("/releases");
  await page.getByRole("searchbox").fill("Nebula");
  await expect(
    page.getByRole("article", { name: "Nebula", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry suggestions" }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry suggestions" }).click();
  await expect(
    page.getByRole("button", { name: "Retry suggestions" }),
  ).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(1);
});

test("real catalogue search finds the seeded release from another month", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_BACKEND_PATH,
    "Requires the isolated full-stack backend",
  );
  const current = currentUkMonth(),
    next = offsetMonth(current, 1);
  await page.goto(`/releases?month=${next}&q=Browser+Test+Feature`);
  await page
    .getByRole("region", { name: "Matches in other months" })
    .getByRole("link", { name: /Browser Test Feature/ })
    .click();
  await expect(
    page.getByRole("article", { name: "Browser Test Feature", exact: true }),
  ).toBeInViewport();
  await expect(page).toHaveURL(new RegExp(`month=${current}`));
});
