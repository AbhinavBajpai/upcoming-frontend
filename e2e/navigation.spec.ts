import { test, expect } from "@playwright/test";

test("navigation, direct links and mobile layout", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("main", { name: "Releases" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Releases", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
  await page.getByRole("link", { name: "Watch list", exact: true }).click();
  await expect(page.getByRole("main", { name: "Watch list" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Watch list", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("main", { name: "Watch list" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Watch list", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
  await page.getByRole("link", { name: "Friends", exact: true }).click();
  await expect(page.getByRole("main", { name: "Friends" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Friends", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
  await page.getByRole("link", { name: "Back to releases" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
