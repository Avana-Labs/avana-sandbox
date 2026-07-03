import { expect, test } from "@playwright/test"

const SESSION_COUNT = Number(process.env.BROWSER_SOAK_SESSIONS ?? 100)
const INTERACTION_DELAY_MS = Number(process.env.BROWSER_SOAK_INTERACTION_DELAY_MS ?? 0)
const BASE_URL = process.env.BROWSER_SOAK_BASE_URL ?? "http://localhost:3000"
const WAIT_UNTIL = process.env.BROWSER_SOAK_WAIT_UNTIL === "domcontentloaded" ? "domcontentloaded" : "load"

const routes = ["/borrow", "/lend", "/multiply", "/dashboard"] as const

test.describe.configure({ mode: "parallel" })

for (let sessionIndex = 0; sessionIndex < SESSION_COUNT; sessionIndex += 1) {
  test(`browser session ${sessionIndex + 1} completes navigation, interaction, and reload`, async ({ page }) => {
    const route = routes[sessionIndex % routes.length]
    const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: WAIT_UNTIL })

    expect(response?.ok()).toBe(true)
    await expect(page.locator('[data-testid="test-mode-wallet"]:visible')).toHaveCount(1)
    if (INTERACTION_DELAY_MS > 0) {
      await page.waitForTimeout(INTERACTION_DELAY_MS)
    }

    const targetTabName = route === "/multiply" ? "BTC Loops" : route === "/dashboard" ? "Borrow" : null
    if (targetTabName) {
      const target = page.getByRole("tab", { name: targetTabName, exact: true })
      await target.click()
      await expect(target).toHaveAttribute("aria-selected", "true")
    }

    await page.reload({ waitUntil: WAIT_UNTIL })
    await expect(page.locator('[data-testid="test-mode-wallet"]:visible')).toHaveCount(1)

    const destination = routes[(sessionIndex + 1) % routes.length]
    const destinationResponse = await page.goto(`${BASE_URL}${destination}`, { waitUntil: WAIT_UNTIL })
    expect(destinationResponse?.ok()).toBe(true)
    expect(await page.locator("main:visible").count()).toBeGreaterThan(0)
  })
}
