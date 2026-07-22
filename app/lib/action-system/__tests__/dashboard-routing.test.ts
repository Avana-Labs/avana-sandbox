import { describe, expect, it } from "vitest"
import {
  dashboardHrefForProduct,
  dashboardTabForProduct,
  parseDashboardTab,
  successDashboardCtaLabel,
} from "@/app/lib/action-system/dashboard-routing"

describe("dashboard-routing", () => {
  it("maps each product to the dashboard tab query value", () => {
    expect(dashboardTabForProduct("borrow")).toBe("borrow")
    expect(dashboardTabForProduct("lend")).toBe("lend")
    expect(dashboardTabForProduct("multiply")).toBe("multiply")
    expect(dashboardTabForProduct("rewards")).toBe("wallet")
  })

  it("routes every product action back to the dashboard page", () => {
    expect(dashboardHrefForProduct("lend")).toBe("/dashboard?tab=lend")
    expect(dashboardHrefForProduct("borrow")).toBe("/dashboard?tab=borrow")
    expect(dashboardHrefForProduct("multiply")).toBe("/dashboard?tab=multiply")
    expect(dashboardHrefForProduct("rewards")).toBe("/dashboard?tab=wallet")
  })

  it("parses valid tab query values", () => {
    expect(parseDashboardTab("wallet")).toBe("wallet")
    expect(parseDashboardTab("borrow")).toBe("borrow")
    expect(parseDashboardTab("invalid")).toBeNull()
    expect(parseDashboardTab(null)).toBeNull()
  })

  it("labels success CTAs to return to the dashboard", () => {
    expect(successDashboardCtaLabel("lend")).toBe("View dashboard")
    expect(successDashboardCtaLabel("borrow")).toBe("View dashboard")
    expect(successDashboardCtaLabel("multiply")).toBe("View dashboard")
    expect(successDashboardCtaLabel("rewards")).toBe("View dashboard")
  })
})
