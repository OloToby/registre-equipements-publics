import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    // Use pre-installed Chromium (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers)
    channel: undefined,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
        },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 5"],
        launchOptions: {
          executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
        },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
