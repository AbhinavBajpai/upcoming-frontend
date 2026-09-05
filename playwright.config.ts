import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      command: "npm run preview",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
    },
    ...(process.env.E2E_BACKEND_PATH
      ? [
          {
            command: "npm run db:migrate && npm start",
            cwd: process.env.E2E_BACKEND_PATH,
            url: "http://127.0.0.1:3000/api/ready",
            reuseExistingServer: false,
            env: {
              AUTH_MODE: "local",
              AUTH_BASE_URL: "http://127.0.0.1:4173",
              SMTP_HOST: "127.0.0.1",
              SMTP_PORT: "1025",
            },
          },
        ]
      : []),
  ],
});
