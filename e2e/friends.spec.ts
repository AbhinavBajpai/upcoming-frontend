import { test, expect } from "@playwright/test";
import { calendarFixture } from "../test/fixtures/calendar";

test("profile sign-in preserves the shared link", async ({ page }) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto("/friends/bob");
  await page.getByRole("link", { name: "Sign in to connect" }).click();
  await expect(page).toHaveURL(/returnTo=%2Ffriends%2Fbob$/);
});
test("request actions, failed writes and permission loss clear the displayed friend list", async ({
  page,
}, info) => {
  let relationship = "none",
    fail = false;
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { user: { id: "alice", displayName: "Alice" } } }),
  );
  await page.route("**/api/stars", (route) =>
    route.fulfill({ json: { today: "2026-09-05", films: [] } }),
  );
  await page.route("**/api/releases?*", (route) =>
    route.fulfill({ json: calendarFixture() }),
  );
  await page.route("**/api/friends/profiles/bob", (route) =>
    route.fulfill({
      json: {
        profile: {
          id: "bob",
          displayName: "Bob",
          relationship,
          relationshipId: relationship === "none" ? null : "request-1",
        },
      },
    }),
  );
  await page.route("**/api/friends/profiles/bob/watch-list", (route) =>
    route.fulfill(
      relationship === "accepted"
        ? {
            json: {
              profile: { id: "bob", displayName: "Bob" },
              today: "2026-09-05",
              films: [
                {
                  ...calendarFixture().films[0],
                  id: "private-film",
                  title: "A private favourite",
                  section: "released",
                },
              ],
            },
          }
        : { status: 404, json: {} },
    ),
  );
  await page.route("**/api/friends/requests/bob", (route) => {
    relationship = "outgoing";
    return route.fulfill({ json: {} });
  });
  await page.route("**/api/friends/relationships/*/*", (route) => {
    if (fail) return route.fulfill({ status: 503, json: {} });
    relationship = route.request().url().endsWith("/accept")
      ? "accepted"
      : "none";
    return route.fulfill({ json: {} });
  });
  await page.goto("/friends/bob");
  await page.getByRole("button", { name: "Send friend request" }).click();
  await expect(
    page.getByRole("button", { name: "Cancel request" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel request" }).click();
  await expect(
    page.getByRole("button", { name: "Send friend request" }),
  ).toBeVisible();
  relationship = "incoming";
  await page.reload();
  await page.getByRole("button", { name: "Decline request" }).click();
  await expect(
    page.getByRole("button", { name: "Send friend request" }),
  ).toBeVisible();
  relationship = "incoming";
  await page.reload();
  fail = true;
  await page.getByRole("button", { name: "Accept request" }).click();
  await expect(page.getByRole("alert")).toContainText("couldn’t save");
  await expect(
    page.getByRole("heading", { name: "A private favourite", exact: true }),
  ).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Accept request" }).click();
  await expect(
    page.getByRole("heading", { name: "A private favourite", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("friend-watch-list.png"),
    fullPage: true,
  });
  relationship = "none";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("heading", { name: "A private favourite", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Send friend request" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("real friends can connect, view lists, save films and disconnect", async ({
  browser,
}, info) => {
  test.skip(!process.env.E2E_BACKEND_PATH, "Requires PostgreSQL backend");
  const a = await browser.newContext({
      ...info.project.use,
      baseURL: "http://127.0.0.1:4173",
    }),
    b = await browser.newContext({
      ...info.project.use,
      baseURL: "http://127.0.0.1:4173",
    });
  try {
    const alice = await a.newPage(),
      bob = await b.newPage();
    for (const [page, name] of [
      [alice, "alice"],
      [bob, "bob"],
    ] as const) {
      await page.bringToFront();
      await page.goto("/login");
      await page
        .getByLabel("Email", { exact: true })
        .fill(`friends-${info.project.name}-${name}@example.test`);
      await page
        .getByLabel("Password", { exact: true })
        .fill("browser-friend-test-password");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(
        page.getByRole("link", { name: "Account", exact: true }),
      ).toBeVisible();
    }
    await bob.bringToFront();
    await bob
      .getByRole("button", {
        name: "Want to watch Browser Test Feature",
        exact: true,
      })
      .click();
    await expect(
      bob.getByRole("button", {
        name: "On your watchlist: Browser Test Feature (remove)",
        exact: true,
      }),
    ).toBeEnabled();
    await bob.getByRole("link", { name: "Friends", exact: true }).click();
    const link = await bob.getByLabel("Your profile link").inputValue();
    await alice.bringToFront();
    await alice.goto(link);
    await alice.getByRole("button", { name: "Send friend request" }).click();
    await expect(
      alice.getByRole("button", { name: "Cancel request" }),
    ).toBeVisible();
    await bob.bringToFront();
    await bob.reload();
    await bob.getByRole("button", { name: "Accept request" }).click();
    await expect(
      bob
        .getByRole("region", { name: "Your friends" })
        .getByRole("link", { name: "Alice", exact: true }),
    ).toBeVisible();
    await bob.screenshot({
      path: info.outputPath("friends.png"),
      fullPage: true,
    });
    await alice.bringToFront();
    await alice.reload();
    await expect(
      alice.getByRole("heading", { name: "Bob’s watch list", exact: true }),
    ).toBeVisible();
    await alice
      .getByRole("button", {
        name: "Want to watch Browser Test Feature",
        exact: true,
      })
      .click();
    await expect(
      alice.getByRole("button", {
        name: "On your watchlist: Browser Test Feature (remove)",
        exact: true,
      }),
    ).toBeEnabled();
    await alice.getByRole("button", { name: "Remove friend" }).click();
    await alice.getByRole("button", { name: "Keep connection" }).click();
    await expect(
      alice.getByRole("heading", { name: "Bob’s watch list", exact: true }),
    ).toBeVisible();
    await alice.getByRole("button", { name: "Remove friend" }).click();
    await alice
      .getByRole("button", { name: "Disconnect", exact: true })
      .click();
    await expect(
      alice.getByRole("heading", { name: "Bob’s watch list", exact: true }),
    ).toHaveCount(0);
    await expect(
      alice.getByRole("button", { name: "Send friend request" }),
    ).toBeVisible();
    await bob.bringToFront();
    await bob.reload();
    await expect(
      bob
        .getByRole("region", { name: "Your friends" })
        .getByRole("link", { name: "Alice", exact: true }),
    ).toHaveCount(0);
  } finally {
    await a.close();
    await b.close();
  }
});
