import { describe, expect, it } from "vitest"
import {
  LIGHTHOUSE_CATEGORY_BUDGETS,
  LIGHTHOUSE_ROUTES,
  NAVIGATION_TIMING_BUDGETS,
  ROUTE_HERO_SELECTORS,
  isLighthouseScoreWithinBudget,
  scoreLighthouseCategory,
} from "@/app/lib/performance/route-budgets"
import { SITE_STATIC_ROUTES } from "@/app/lib/route-manifest"

describe("performance route budgets", () => {
  it("audits every high-priority static route from the manifest", () => {
    const manifestRoutes = SITE_STATIC_ROUTES.map((entry) => (entry.route === "" ? "/" : entry.route))

    for (const route of manifestRoutes) {
      expect(LIGHTHOUSE_ROUTES).toContain(route)
    }
  })

  it("maps each primary route to an early-visible hero marker", () => {
    const primaryRoutes = ["/", "/borrow", "/lend", "/multiply", "/dashboard", "/rewards", "/support-center"]

    for (const route of primaryRoutes) {
      expect(ROUTE_HERO_SELECTORS.some((entry) => entry.route === route)).toBe(true)
    }
  })

  it("normalizes lighthouse category scores", () => {
    expect(scoreLighthouseCategory(0.819)).toBe(82)
    expect(scoreLighthouseCategory(null)).toBe(0)
  })

  it("enforces documented lighthouse floors", () => {
    expect(isLighthouseScoreWithinBudget("performance", LIGHTHOUSE_CATEGORY_BUDGETS.performance)).toBe(true)
    expect(isLighthouseScoreWithinBudget("performance", LIGHTHOUSE_CATEGORY_BUDGETS.performance - 1)).toBe(false)
    expect(isLighthouseScoreWithinBudget("accessibility", 90)).toBe(true)
  })

  it("keeps navigation timing budgets realistic for CI", () => {
    expect(NAVIGATION_TIMING_BUDGETS.domContentLoadedMs).toBeGreaterThanOrEqual(2_000)
    expect(NAVIGATION_TIMING_BUDGETS.heroVisibleMs).toBeGreaterThan(NAVIGATION_TIMING_BUDGETS.domContentLoadedMs)
  })
})
