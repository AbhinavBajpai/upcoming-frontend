import { test, expect } from "@playwright/test";
import { calendarFixture } from "../test/fixtures/calendar";
test("batched names, larger groups and refreshed privacy across all film views", async ({
  page,
}, info) => {
  let connected = true,
    interestCalls = 0,
    fail = false;
  const calendar = calendarFixture();
  const nebula = calendar.films.find((f) => f.title === "Nebula")!;
  await page.clock.setFixedTime(new Date("2026-09-05T12:00:00Z"));
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { user: { id: "alice", displayName: "Alice" } } }),
  );
  await page.route("**/api/releases?*", (route) =>
    route.fulfill({ json: calendar }),
  );
  await page.route("**/api/stars", (route) =>
    route.fulfill({
      json: {
        today: "2026-09-05",
        films: [{ ...nebula, section: "upcoming" }],
      },
    }),
  );
  await page.route("**/api/friends/profiles/bob", (route) =>
    route.fulfill({
      json: {
        profile: {
          id: "bob",
          displayName: "Bob",
          relationship: connected ? "accepted" : "none",
          relationshipId: connected ? "request-1" : null,
        },
      },
    }),
  );
  await page.route("**/api/friends/profiles/bob/watch-list", (route) =>
    route.fulfill({
      json: {
        profile: { id: "bob", displayName: "Bob" },
        today: "2026-09-05",
        films: [{ ...nebula, section: "upcoming" }],
      },
    }),
  );
  await page.route("**/api/friends/interest?*", (route) => {
    interestCalls++;
    if (fail) return route.fulfill({ status: 401, json: {} });
    const ids = new URL(route.request().url()).searchParams
      .get("filmIds")!
      .split(",");
    return route.fulfill({
      json: {
        films: ids.map((filmId) => ({
          filmId,
          friends:
            connected && filmId === nebula.id
              ? [
                  { id: "bob", displayName: "Bob" },
                  { id: "dan", displayName: "Dan" },
                  { id: "eve", displayName: "Eve" },
                ]
              : [],
        })),
      },
    });
  });
  await page.route("**/api/friends/relationships/*/remove", (route) => {
    connected = false;
    return route.fulfill({ json: {} });
  });
  await page.goto("/releases");
  const card = page.getByRole("article", { name: "Nebula", exact: true });
  await expect(card.getByText("3 friends want to watch")).toBeVisible();
  expect(interestCalls).toBe(1);
  await card.locator("summary").click();
  await expect(
    card.getByRole("link", { name: "Bob", exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("link", { name: "Eve", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("friend-interest.png") });
  await page.getByRole("link", { name: "Watch list", exact: true }).click();
  await expect(
    page
      .getByRole("article", { name: "Nebula", exact: true })
      .getByText("3 friends want to watch"),
  ).toBeVisible();
  await page.goto("/friends/bob");
  await expect(
    page
      .getByRole("article", { name: "Nebula", exact: true })
      .getByText("3 friends want to watch"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove friend", exact: true })
    .click();
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bob’s watch list", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Releases", exact: true }).click();
  await expect(page.getByText("3 friends want to watch")).toHaveCount(0);
  connected = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(card.getByText("3 friends want to watch")).toBeVisible();
  fail = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("3 friends want to watch")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Retry friends’ interest" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
