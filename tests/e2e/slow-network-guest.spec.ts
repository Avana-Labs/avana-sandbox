import { expect, test } from "@playwright/test"

test.describe("cold visits on slow connections", () => {
  test.skip(process.env.AVANA_GUEST_CLOSED_GATE_E2E !== "1", "Run with the production guest configuration.")
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "Network and CPU throttling use CDP.")
    const cdp = await context.newCDPSession(page)
    await cdp.send("Network.enable")
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true })
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 200_000,
      uploadThroughput: 93_750,
      connectionType: "cellular3g",
    })
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
  })

  test("first search tap works without waiting for result icons", async ({ page }) => {
    await page.route("**/asset-icons/**", (route) => route.abort())
    await page.goto("/", { waitUntil: "domcontentloaded" })
    // Click as soon as the control is enabled, without a hydration sleep or second tap.
    await page.getByRole("button", { name: "Search Avana", exact: true }).click()
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 20_000 })
    await page.getByRole("combobox").fill("usdc")
    await expect(page.getByRole("option").first()).toContainText("USDC")
  })

  for (const route of ["/lend", "/dashboard", "/swap"]) {
    test(`${route} renders on a cold connection`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(route, { waitUntil: "domcontentloaded" })
      const content =
        route === "/dashboard"
          ? page.getByTestId("onboarding-canvas")
          : route === "/swap"
            ? page.getByRole("button", { name: /^Sell asset/ })
            : page.getByRole("main").first()
      await expect(content).toBeVisible({ timeout: 20_000 })
      expect(errors).toEqual([])
    })
  }
})
