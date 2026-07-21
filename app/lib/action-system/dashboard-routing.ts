import type { ActionProduct } from "./contracts"

export type DashboardTabKey = "lending" | "overview" | "looping" | "activity"

const PRODUCT_TAB: Record<ActionProduct, DashboardTabKey> = {
  borrow: "overview",
  lend: "lending",
  multiply: "looping",
  rewards: "activity",
}

const TAB_LABELS: Record<DashboardTabKey, string> = {
  lending: "Lend",
  overview: "Borrow",
  looping: "Multiply",
  activity: "Activity",
}

export function dashboardTabForProduct(product: ActionProduct): DashboardTabKey {
  return PRODUCT_TAB[product]
}

// The per-product account overviews now all live on the dashboard page, which
// doesn't deep-link to a specific tab via the URL — so every product returns there.
export function dashboardHrefForProduct(_product: ActionProduct): string {
  return "/dashboard"
}

export function dashboardHrefForTab(_tab: DashboardTabKey): string {
  return "/dashboard"
}

export function dashboardTabLabel(tab: DashboardTabKey): string {
  return TAB_LABELS[tab]
}

export function parseDashboardTab(value: string | null | undefined): DashboardTabKey | null {
  if (value === "multiply") return "looping"
  if (value === "lending" || value === "overview" || value === "looping" || value === "activity") {
    return value
  }
  return null
}

export function successDashboardCtaLabel(_product: ActionProduct): string {
  return "View dashboard"
}
