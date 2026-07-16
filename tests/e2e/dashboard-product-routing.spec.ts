import { expect, test } from "@playwright/test"

// The lend account section moved to the rewards page, so the dashboard only
// focuses the borrow and multiply account sections now.
const cases = [
  { tab: "overview", sectionId: "dashboard-borrow-account", heading: "Borrow Account" },
  { tab: "looping", sectionId: "dashboard-multiply-account", heading: "Multiply Account" },
]

for (const route of cases) {
  test(`dashboard ${route.tab} route visibly focuses ${route.heading}`, async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`/dashboard?tab=${route.tab}#${route.sectionId}`, { waitUntil: "commit" })
    const section = page.locator(`#${route.sectionId}`)
    await expect(section).toBeVisible({ timeout: 15_000 })
    await expect(section.getByRole("heading", { name: route.heading })).toBeVisible()
    await expect
      .poll(async () => {
        const box = await section.boundingBox()
        return box ? Math.round(box.y) : null
      })
      .toBeLessThan(180)
  })
}
