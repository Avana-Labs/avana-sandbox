import { expect, test } from "@playwright/test"

const ACTION_ROUTES = [
  { name: "borrow-select", path: "/actions/borrow/borrow" },
  { name: "borrow-configure", path: "/actions/borrow/borrow?asset=usdc&amount=1000" },
  { name: "repay-select", path: "/actions/borrow/repay" },
  { name: "repay-configure", path: "/actions/borrow/repay?amount=500" },
  { name: "supply-configure", path: "/actions/borrow/supply?amount=1000" },
  { name: "remove-configure", path: "/actions/borrow/remove" },
  { name: "borrow-claim", path: "/actions/borrow/claim" },
  { name: "lend-deposit", path: "/actions/lend/deposit?amount=10&market=gho" },
  { name: "lend-withdraw-select", path: "/actions/lend/withdraw" },
  { name: "lend-withdraw-configure", path: "/actions/lend/withdraw?market=gho&amount=1" },
  { name: "multiply-configure", path: "/actions/multiply/multiply?multiplier=2&amount=1" },
  { name: "deleverage-configure", path: "/actions/multiply/deleverage?multiplier=1.5&amount=1" },
  { name: "rewards-claim", path: "/actions/rewards/claim" },
] as const

test.describe("action pages smoke", () => {
  for (const route of ACTION_ROUTES) {
    test(`${route.name} loads shell`, async ({ page }) => {
      await page.goto(route.path)
      await expect(page.getByTestId("action-page-shell")).toBeVisible({ timeout: 30_000 })
    })
  }
})

test.describe("action pages visual", () => {
  for (const route of ACTION_ROUTES) {
    test(`${route.name} screenshot`, async ({ page }) => {
      await page.goto(route.path)
      await expect(page.getByTestId("action-page-shell")).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(500)
      await expect(page.getByTestId("action-page-shell")).toHaveScreenshot(`${route.name}.png`, {
        maxDiffPixelRatio: 0.04,
      })
    })
  }
})
