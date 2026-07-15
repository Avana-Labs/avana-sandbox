import { expect, test } from "@playwright/test"

const lifecycles = [
  {
    name: "borrow open",
    path: "/actions/borrow/borrow?asset=uni-v3-bluechip:usdc&market=uni-v3-bluechip-weth-usdc&amount=1",
    dashboardSection: "dashboard-borrow-account",
  },
  {
    name: "lend deposit",
    path: "/actions/lend/deposit?market=usdc&amount=1",
    dashboardSection: "dashboard-lend-account",
  },
  {
    name: "multiply open",
    path: "/actions/multiply/multiply?market=aave-gho&multiplier=2&amount=1",
    dashboardSection: "dashboard-multiply-account",
  },
  {
    name: "borrow repay",
    path: "/actions/borrow/repay?market=uni-v3-bluechip-weth-usdc&amount=1",
    dashboardSection: "dashboard-borrow-account",
    selectName: "USD Coin USDC $1,200 owed",
  },
  {
    name: "lend withdraw",
    path: "/actions/lend/withdraw?market=gho&amount=1",
    dashboardSection: "dashboard-lend-account",
  },
] as const

for (const lifecycle of lifecycles) {
  test(`${lifecycle.name} completes configure, review, success, and dashboard reconciliation`, async ({ page }) => {
    test.setTimeout(45_000)
    await page.goto(lifecycle.path, { waitUntil: "commit" })
    if ("selectName" in lifecycle) {
      await page.getByRole("button", { name: lifecycle.selectName, exact: true }).click()
    }

    const configurePrimary = page.getByTestId("action-footer").locator("button").last()
    await expect(configurePrimary).toBeEnabled({ timeout: 15_000 })
    await configurePrimary.click()

    const review = page.getByTestId("action-review-stage")
    await expect(review).toBeVisible()
    await expect(review.getByText("Quote", { exact: true })).toBeVisible()
    await review.getByTestId("action-footer").locator("button").last().click()

    const success = page.getByTestId("action-success-stage")
    await expect(success).toBeVisible({ timeout: 15_000 })
    await expect(success.getByText("Quote", { exact: true })).toBeVisible()

    await success.getByTestId("action-footer").locator(`a[href$="#${lifecycle.dashboardSection}"]`).click()
    await expect(page.locator(`#${lifecycle.dashboardSection}`)).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(new RegExp(`#${lifecycle.dashboardSection}$`))
  })
}
