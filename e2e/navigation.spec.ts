import { test, expect } from "@playwright/test";

test("navigation, direct links and mobile layout", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Make time",
  );
  await page.getByRole("link", { name: "Watch list", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Worth the wait.",
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Worth the wait.",
  );
  await page.getByRole("link", { name: "Friends", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Bring your people.",
  );
  await page.getByRole("link", { name: "Back to releases" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
