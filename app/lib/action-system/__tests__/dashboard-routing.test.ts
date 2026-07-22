import { describe, expect, it } from "vitest"
import {
  dashboardHrefForProduct,
  dashboardHrefForTab,
  dashboardTabForProduct,
  parseDashboardTab,
  successDashboardCtaLabel,
} from "@/app/lib/action-system/dashboard-routing"

describe("dashboard-routing", () => {
  it("maps each product to the correct dashboard tab", () => {
    expect(dashboardTabForProduct("borrow")).toBe("overview")
    expect(dashboardTabForProduct("lend")).toBe("lending")
    expect(dashboardTabForProduct("multiply")).toBe("looping")
    expect(dashboardTabForProduct("rewards")).toBe("activity")
  })

  it("routes every product action back to the dashboard page", () => {
    expect(dashboardHrefForProduct("lend")).toBe("/dashboard?tab=lend")
    expect(dashboardHrefForProduct("borrow")).toBe("/dashboard?tab=borrow")
    expect(dashboardHrefForProduct("multiply")).toBe("/dashboard?tab=multiply")
    expect(dashboardHrefForProduct("rewards")).toBe("/dashboard?tab=wallet")
    expect(dashboardHrefForTab("overview")).toBe("/dashboard?tab=borrow")
    expect(dashboardHrefForTab("lending")).toBe("/dashboard?tab=lend")
  })

  it("parses valid tab query values", () => {
    expect(parseDashboardTab("lending")).toBe("lending")
    expect(parseDashboardTab("overview")).toBe("overview")
    expect(parseDashboardTab("looping")).toBe("looping")
    expect(parseDashboardTab("activity")).toBe("activity")
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
