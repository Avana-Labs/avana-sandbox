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

  it("routes every product action back to the portfolio page", () => {
    expect(dashboardHrefForProduct("lend")).toBe("/portfolio")
    expect(dashboardHrefForProduct("borrow")).toBe("/portfolio")
    expect(dashboardHrefForProduct("multiply")).toBe("/portfolio")
    expect(dashboardHrefForProduct("rewards")).toBe("/portfolio")
    expect(dashboardHrefForTab("overview")).toBe("/portfolio")
    expect(dashboardHrefForTab("lending")).toBe("/portfolio")
  })

  it("parses valid tab query values", () => {
    expect(parseDashboardTab("lending")).toBe("lending")
    expect(parseDashboardTab("overview")).toBe("overview")
    expect(parseDashboardTab("looping")).toBe("looping")
    expect(parseDashboardTab("activity")).toBe("activity")
    expect(parseDashboardTab("invalid")).toBeNull()
    expect(parseDashboardTab(null)).toBeNull()
  })

  it("labels success CTAs to return to the portfolio", () => {
    expect(successDashboardCtaLabel("lend")).toBe("View portfolio")
    expect(successDashboardCtaLabel("borrow")).toBe("View portfolio")
    expect(successDashboardCtaLabel("multiply")).toBe("View portfolio")
    expect(successDashboardCtaLabel("rewards")).toBe("View portfolio")
  })
})
