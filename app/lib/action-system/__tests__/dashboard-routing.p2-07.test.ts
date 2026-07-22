import { describe, expect, it } from "vitest"
import {
  dashboardHrefForProduct,
  dashboardTabForProduct,
  parseDashboardTab,
} from "@/app/lib/action-system/dashboard-routing"

describe("dashboard-routing vocabulary", () => {
  it("P2-07: uses one dashboard tab vocabulary without legacy aliases", () => {
    expect(dashboardTabForProduct("borrow")).toBe("borrow")
    expect(dashboardTabForProduct("lend")).toBe("lend")
    expect(dashboardTabForProduct("multiply")).toBe("multiply")
    expect(dashboardTabForProduct("rewards")).toBe("wallet")
    expect(dashboardHrefForProduct("borrow")).toBe("/dashboard?tab=borrow")
    expect(parseDashboardTab("borrow")).toBe("borrow")
    expect(parseDashboardTab("wallet")).toBe("wallet")
    expect(parseDashboardTab("lending")).toBeNull()
    expect(parseDashboardTab("overview")).toBeNull()
    expect(parseDashboardTab("looping")).toBeNull()
    expect(parseDashboardTab("activity")).toBeNull()
  })
})
