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

  it("builds dashboard hrefs with tab query params", () => {
    expect(dashboardHrefForProduct("lend")).toBe("/dashboard?tab=lending")
    expect(dashboardHrefForProduct("borrow")).toBe("/dashboard?tab=overview#dashboard-borrow-account")
    expect(dashboardHrefForProduct("multiply")).toBe("/dashboard?tab=looping#dashboard-multiply-account")
    expect(dashboardHrefForProduct("rewards")).toBe("/dashboard?tab=activity")
    expect(dashboardHrefForTab("overview")).toBe("/dashboard?tab=overview#dashboard-borrow-account")
    expect(dashboardHrefForTab("lending")).toBe("/dashboard?tab=lending")
  })

  it("parses valid tab query values", () => {
    expect(parseDashboardTab("lending")).toBe("lending")
    expect(parseDashboardTab("overview")).toBe("overview")
    expect(parseDashboardTab("looping")).toBe("looping")
    expect(parseDashboardTab("activity")).toBe("activity")
    expect(parseDashboardTab("invalid")).toBeNull()
    expect(parseDashboardTab(null)).toBeNull()
  })

  it("labels success CTAs with the matching dashboard tab", () => {
    expect(successDashboardCtaLabel("lend")).toBe("View Lend dashboard")
    expect(successDashboardCtaLabel("borrow")).toBe("View Borrow dashboard")
    expect(successDashboardCtaLabel("multiply")).toBe("View Multiply dashboard")
    expect(successDashboardCtaLabel("rewards")).toBe("View Activity dashboard")
  })
})
