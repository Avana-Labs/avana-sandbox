import { test, expect } from "@playwright/test"
import {
  LIGHTHOUSE_ROUTES,
  ROUTE_HERO_SELECTORS,
  getNavigationTimingBudget,
} from "../../app/lib/performance/route-budgets"

const PRIMARY_ROUTES = ROUTE_HERO_SELECTORS.filter((entry) => LIGHTHOUSE_ROUTES.includes(entry.route))

for (const { route, heroText, heroRole } of PRIMARY_ROUTES) {
  test(`route ${route} paints hero content within budget`, async ({ page }) => {
    const timingBudget = getNavigationTimingBudget(route)
    const startedAt = Date.now()

    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 })

    const domContentLoadedMs = Date.now() - startedAt
    expect(
      domContentLoadedMs,
      `${route} DOMContentLoaded exceeded ${timingBudget.domContentLoadedMs}ms`,
    ).toBeLessThanOrEqual(timingBudget.domContentLoadedMs)

    const heroLocator =
      heroRole === "tab"
        ? page.getByRole("tab", { name: heroText })
        : heroRole === "heading"
          ? page.getByRole("heading", { name: heroText })
          : page.getByText(heroText, { exact: false }).first()

    await expect(heroLocator).toBeVisible({
      timeout: timingBudget.heroVisibleMs,
    })
  })
}

test("borrow keeps the workspace shell below the hero", async ({ page }) => {
  await page.goto("/borrow", { waitUntil: "domcontentloaded" })
  await expect(page.getByText("Total TVL").first()).toBeVisible()
  await expect(page.locator(".borrow-workspace-shell")).toBeVisible()
})

test("home borrow CTA is present in the initial HTML", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" })

  const html = await page.content()
  expect(html).toContain("Continue to borrow")
})
