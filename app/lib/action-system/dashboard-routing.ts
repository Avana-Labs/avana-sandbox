import type { ActionProduct } from "./contracts"

export type DashboardTabKey = "lending" | "overview" | "looping" | "activity"
type DashboardRouteTab = "wallet" | "lend" | "borrow" | "multiply" | "referrals"

const PRODUCT_TAB: Record<ActionProduct, DashboardTabKey> = {
  borrow: "overview",
  lend: "lending",
  multiply: "looping",
  rewards: "activity",
}

const PRODUCT_DASHBOARD_ROUTE_TAB: Record<ActionProduct, DashboardRouteTab> = {
  borrow: "borrow",
  lend: "lend",
  multiply: "multiply",
  rewards: "wallet",
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

export function dashboardHrefForProduct(product: ActionProduct): string {
  return `/dashboard?tab=${PRODUCT_DASHBOARD_ROUTE_TAB[product]}`
}

export function dashboardHrefForTab(tab: DashboardTabKey): string {
  const product = (Object.keys(PRODUCT_TAB) as ActionProduct[]).find((key) => PRODUCT_TAB[key] === tab)
  return product ? dashboardHrefForProduct(product) : "/dashboard"
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
