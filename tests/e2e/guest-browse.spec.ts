import { expect, test } from "@playwright/test"

/**
 * Guests browse every product route on live data; only the dashboard and umbrella show the
 * onboarding flow. Needs a closed gate (the default Playwright server runs the open gate):
 *   AVANA_GUEST_CLOSED_GATE_E2E=1 PLAYWRIGHT_BASE_URL=<server without NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE>
 */
test.describe("guest browsing", () => {
  test.skip(
    process.env.AVANA_GUEST_CLOSED_GATE_E2E !== "1",
    "Set AVANA_GUEST_CLOSED_GATE_E2E=1 against a server without NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE.",
  )
  test.use({ viewport: { width: 1440, height: 900 } })

  for (const path of ["/", "/borrow/markets/bal-stable-gho-usdc"]) {
    test(`${path} shows the product with a Connect Wallet CTA`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByTestId("onboarding-canvas")).toHaveCount(0)
      const cta = page.getByTestId("action-footer-primary")
      await expect(cta).toHaveText("Connect Wallet", { timeout: 20_000 })
      await cta.click()
      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByTestId("onboarding-canvas")).toBeVisible()
      await expect(page.getByRole("heading", { name: /Welcome to the Avana Sandbox/ })).toBeVisible()
    })
  }

  for (const path of ["/borrow", "/lend", "/multiply"]) {
    test(`${path} renders for a guest`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator("main")).toBeVisible()
      await expect(page.getByTestId("onboarding-canvas")).toHaveCount(0)
    })
  }

  for (const path of ["/dashboard", "/umbrella"]) {
    test(`${path} shows the onboarding flow`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByTestId("onboarding-canvas")).toBeVisible()
    })
  }

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } })

    for (const path of ["/lend/markets/usdc", "/borrow/markets/bal-stable-gho-usdc"]) {
      test(`${path} shows one Connect Wallet button`, async ({ page }) => {
        await page.goto(path)
        const bar = page.locator("a[href='/dashboard']", { hasText: "Connect Wallet" })
        await expect(bar).toHaveCount(1, { timeout: 20_000 })
        await expect(page.getByRole("link", { name: /Deposit|Withdraw|Supply|Claim/ })).toHaveCount(0)
      })
    }
  })
})
