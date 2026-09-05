import { test, expect, type APIRequestContext } from "@playwright/test";

// Full-stack only: this uses the real backend, PostgreSQL and local SMTP capture.
test.skip(
  !process.env.E2E_BACKEND_PATH,
  "Set E2E_BACKEND_PATH for the account integration flow",
);
async function emailLink(
  request: APIRequestContext,
  address: string,
  subject: string,
) {
  let id = "";
  await expect
    .poll(async () => {
      const response = await request.get(
        "http://127.0.0.1:8025/api/v1/messages",
      );
      const data = (await response.json()) as {
        messages: { ID: string; Subject: string; To: { Address: string }[] }[];
      };
      id =
        data.messages.find(
          (m) =>
            m.Subject === subject && m.To.some((to) => to.Address === address),
        )?.ID ?? "";
      return !!id;
    })
    .toBe(true);
  const response = await request.get(
    `http://127.0.0.1:8025/api/v1/message/${id}`,
  );
  const data = (await response.json()) as { Text: string };
  const url = data.Text.match(/http:\/\/127\.0\.0\.1:4173\/\S+/)?.[0];
  if (!url) throw new Error("Captured message has no account link");
  return url;
}
test("register, verify, sign in, edit profile, recover password and sign out", async ({
  page,
  request,
}, info) => {
  const email = `browser-${info.project.name}-${Date.now()}@example.test`;
  const password = "a-long-browser-password";
  await page.goto("/signup");
  await page.getByLabel("Display name", { exact: true }).fill("Cinema Friend");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.screenshot({ path: info.outputPath("signup.png") });
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox." }),
  ).toBeVisible();
  await page.goto(
    await emailLink(request, email, "Verify your Upcoming email"),
  );
  await expect(
    page.getByText("Email verified. You can now sign in."),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Account", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Cinema Friend",
  );
  await page.getByLabel("Display name", { exact: true }).fill("Film Friend");
  await page.getByRole("button", { name: "Save display name" }).click();
  await expect(page.getByText("Display name updated.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Film Friend",
  );
  // Recover while still signed in: loading the profile must not lose the reset token.
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page.getByText(/If there’s an account for this address/),
  ).toBeVisible();
  await page.goto(
    await emailLink(request, email, "Reset your Upcoming password"),
  );
  await expect(page).toHaveURL(/\/reset-password$/);
  await page
    .getByLabel("New password", { exact: true })
    .fill("a-new-browser-password");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(
    page.getByText("Password updated. Please sign in again."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("a-new-browser-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Account", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
