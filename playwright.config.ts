import { defineConfig, devices } from "@playwright/test"

const testPort = process.env.PLAYWRIGHT_PORT ?? "3000"
const testBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${testPort}`

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  snapshotPathTemplate: "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",
  use: {
    baseURL: testBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE=1 npm run dev -- --port ${testPort}`,
    url: testBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /app-audit\.spec\.ts|route-performance\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 560, height: 960 },
        launchOptions: {
          args: ["--hide-scrollbars"],
        },
      },
    },
    {
      name: "performance",
      testMatch: /route-performance\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "mobile",
      testMatch: /app-audit\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      testMatch: /app-audit\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "xl",
      testMatch: /app-audit\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.03,
      animations: "disabled",
    },
  },
})
