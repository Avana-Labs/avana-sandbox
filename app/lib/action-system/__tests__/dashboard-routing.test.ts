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
    expect(dashboardHrefForProduct("lend")).toBe("/dashboard#dashboard-lend-account")
    expect(dashboardHrefForProduct("borrow")).toBe("/dashboard#dashboard-borrow-account")
    expect(dashboardHrefForProduct("multiply")).toBe("/dashboard#dashboard-multiply-account")
    expect(dashboardHrefForProduct("rewards")).toBe("/dashboard#dashboard-activity")
    expect(dashboardHrefForTab("overview")).toBe("/dashboard#dashboard-borrow-account")
    expect(dashboardHrefForTab("lending")).toBe("/dashboard#dashboard-lend-account")
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
