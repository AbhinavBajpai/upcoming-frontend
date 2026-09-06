import { test, expect } from "@playwright/test";
import { calendarFixture } from "../test/fixtures/calendar";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-05T12:00:00Z"));
  const film = calendarFixture().films.find((f) => f.title === "Nebula")!;
  const films = [
    { ...film, section: "upcoming" },
    {
      ...film,
      id: "old",
      title: "Last year",
      releaseDate: "2025-12-20",
      section: "released",
    },
    {
      ...film,
      id: "next",
      title: "Next month film",
      releaseDate: "2026-10-02",
      section: "upcoming",
    },
    {
      ...film,
      id: "tbc",
      title: "Undated film",
      releaseDate: null,
      section: "tbc",
    },
  ];
  await page.route("**/api/friends", (route) =>
    route.fulfill({ json: { accepted: [], incoming: [], outgoing: [] } }),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { user: { id: "alice", displayName: "Alice" } } }),
  );
  await page.route("**/api/releases?*", (route) =>
    route.fulfill({
      json: calendarFixture(
        new URL(route.request().url()).searchParams.get("month")!,
      ),
    }),
  );
  await page.route("**/api/stars", (route) =>
    route.fulfill({ json: { today: "2026-09-05", films } }),
  );
  await page.route("**/api/friends/profiles/bob", (route) =>
    route.fulfill({
      json: {
        profile: {
          id: "bob",
          displayName: "Bob",
          relationship: "accepted",
          relationshipId: "request",
        },
      },
    }),
  );
  await page.route("**/api/friends/profiles/bob/watch-list", (route) =>
    route.fulfill({
      json: {
        profile: { id: "bob", displayName: "Bob" },
        today: "2026-09-05",
        films,
      },
    }),
  );
  await page.route("**/api/friends/interest?*", (route) =>
    route.fulfill({
      json: {
        films: new URL(route.request().url()).searchParams
          .get("filmIds")!
          .split(",")
          .map((filmId) => ({
            filmId,
            friends: [{ id: "bob", displayName: "Bob" }],
          })),
      },
    }),
  );
});

test("personal and friend lists paginate months without losing old or undated films", async ({
  page,
}, info) => {
  for (const path of ["/starred", "/friends/bob"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "September 2026", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: "Nebula", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByRole("button", { name: "Next month", exact: true }).click();
    const next = page.getByRole("article", {
      name: "Next month film",
      exact: true,
    });
    await expect(next).toBeVisible();
    await expect(
      next.getByRole("link", { name: "Bob", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Next month", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("combobox", { name: "Watch list month" })
      .selectOption("2025-12");
    await expect(
      page.getByRole("article", { name: "Last year", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Previous month", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Next month", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "January 2026", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("No watch-list films this month.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "TBC (1)", exact: true }).click();
    await expect(
      page.getByRole("article", { name: "Undated film", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "This month", exact: true }).click();
    await expect(
      page.getByRole("article", { name: "Nebula", exact: true }),
    ).toBeVisible();
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("monthly-friend-list.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("mobile date rail supports dragging, keyboard navigation and ordinary scrolling", async ({
  page,
  isMobile,
}, info) => {
  test.skip(!isMobile, "The date rail is a mobile control");
  await page.goto("/releases");
  const rail = page.getByRole("slider", {
    name: "Browse dates in September 2026",
  });
  await expect(rail).toBeVisible();
  await expect(rail.locator("span")).toHaveCount(30);
  await expect(rail.locator(".date-empty")).toHaveCount(27);
  await rail.focus();
  await rail.press("End");
  await expect(rail).toHaveAttribute("aria-valuenow", "30");
  await expect(
    page.locator('[data-release-date="2026-09-30"]'),
  ).toBeInViewport();
  const bounds = (await rail.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  const x = bounds.x + bounds.width / 2;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: bounds.y + bounds.height - 4 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: bounds.y + (bounds.height * 4.5) / 30 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await touch.detach();
  await expect(rail).toHaveAttribute("aria-valuenow", "5");
  await expect(
    page.locator('[data-release-date="2026-09-05"]'),
  ).toBeInViewport();
  await page.screenshot({ path: info.outputPath("mobile-date-rail.png") });
  await page
    .locator('[data-release-date="2026-09-01"]')
    .evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(rail).toHaveAttribute("aria-valuenow", "1");
  await page.getByRole("link", { name: "Friends", exact: true }).click();
  await expect(rail).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("both watch lists can show recent and future releases together", async ({
  page,
}) => {
  for (const path of ["/starred", "/friends/bob"]) {
    await page.goto(path);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(2);
    await expect(
      page.getByRole("article", { name: "Nebula", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: "Next month film", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: "Last year", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "TBC (1)", exact: true }).click();
    await expect(
      page.getByRole("article", { name: "Undated film", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "TBC (1)", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(2);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
  }
});

test("mobile month controls stay below the header while scrolling, with larger posters", async ({
  page,
  isMobile,
}, info) => {
  test.skip(!isMobile);
  await page.goto("/releases");
  await expect(
    page.getByRole("article", { name: "Nebula", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1400));
  const controls = page.locator(".release-month-navigation");
  await expect(controls).toBeInViewport();
  const header = (await page.locator(".site-header").boundingBox())!;
  const box = (await controls.boundingBox())!;
  expect(Math.abs(box.y - (header.y + header.height))).toBeLessThan(2);
  expect((await page.locator(".poster").first().boundingBox())!.width).toBe(
    110,
  );
  await page.screenshot({ path: info.outputPath("sticky-month-controls.png") });
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "October 2026", exact: true }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 320, height: 700 });
  await expect(
    page.getByRole("article", { name: "The Devils", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("narrow-ticket.png"),
    fullPage: true,
  });
});

test("Friends tab shows incoming requests and retains the badge on blur", async ({
  page,
}, info) => {
  await page.route("**/api/friends", (route) =>
    route.fulfill({
      json: {
        accepted: [],
        outgoing: [],
        incoming: [
          {
            id: "request",
            userId: "bob",
            displayName: "Bob",
            relationship: "incoming",
          },
        ],
      },
    }),
  );
  await page.goto("/releases");
  const tab = page.getByRole("link", {
    name: /Friends.*1 incoming friend request/,
  });
  await expect(tab).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(tab.locator(".friends-badge")).toHaveText("1");
  await page.screenshot({ path: info.outputPath("friends-request-badge.png") });
});

test("mobile watch-list controls share a sticky two-row layout on personal and friend lists", async ({
  page,
  isMobile,
}, info) => {
  test.skip(!isMobile);
  const films = calendarFixture().films.map((film) => ({
    ...film,
    section: "upcoming",
  }));
  await page.route("**/api/stars", (route) =>
    route.fulfill({ json: { today: "2026-09-05", films } }),
  );
  await page.route("**/api/friends/profiles/bob/watch-list", (route) =>
    route.fulfill({
      json: {
        profile: { id: "bob", displayName: "Bob" },
        today: "2026-09-05",
        films,
      },
    }),
  );
  for (const path of ["/starred", "/friends/bob"]) {
    await page.goto(path);
    await expect(
      page.getByRole("article", { name: "Nebula", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 1400));
    const controls = page.locator(".watch-month-navigation");
    const header = (await page.locator(".site-header").boundingBox())!;
    await expect(controls).toBeInViewport();
    const bounds = (await controls.boundingBox())!;
    expect(Math.abs(bounds.y - header.y - header.height)).toBeLessThan(2);
    const monthButtons = (await controls
      .locator(".month-controls")
      .boundingBox())!;
    const lowerRow = (await controls
      .locator(".watch-view-controls")
      .boundingBox())!;
    expect(lowerRow.y).toBeGreaterThanOrEqual(
      monthButtons.y + monthButtons.height,
    );
    const rail = page.getByRole("slider");
    await expect(rail).toBeVisible();
    expect((await rail.boundingBox())!.y).toBeGreaterThanOrEqual(
      bounds.y + bounds.height,
    );
    await rail.focus();
    await rail.press("End");
    const date = page.locator('[data-release-date="2026-09-30"]');
    await expect(date).toBeInViewport();
    expect((await date.boundingBox())!.y).toBeGreaterThanOrEqual(
      bounds.y + bounds.height - 2,
    );
    await page.screenshot({
      path: info.outputPath(
        path === "/starred"
          ? "sticky-own-watch-list.png"
          : "sticky-friend-watch-list.png",
      ),
    });
    await controls.getByRole("button", { name: "All", exact: true }).click();
    await expect(
      controls.getByRole("button", { name: "All", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      controls.getByRole("button", { name: "This month", exact: true }),
    ).toBeEnabled();
    await controls
      .getByRole("button", { name: "This month", exact: true })
      .click();
    await expect(controls.getByRole("combobox")).toHaveValue("2026-09");
    await controls
      .getByRole("button", { name: "TBC (0)", exact: true })
      .click();
    await controls.getByRole("combobox").selectOption("2026-09");
    await expect(
      controls.getByRole("button", { name: "TBC (0)", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.setViewportSize({ width: 320, height: 700 });
    const rowControls = controls
      .locator(".watch-view-controls")
      .locator("button, select");
    const boxes = await Promise.all(
      (await rowControls.all()).map((control) => control.boundingBox()),
    );
    expect(
      Math.max(...boxes.map((box) => box!.y)) -
        Math.min(...boxes.map((box) => box!.y)),
    ).toBeLessThan(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(
        path === "/starred"
          ? "narrow-own-watch-list.png"
          : "narrow-friend-watch-list.png",
      ),
    });
    await page.setViewportSize({ width: 390, height: 844 });
  }
});
