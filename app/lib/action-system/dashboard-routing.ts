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

const PRODUCT_SECTION: Record<ActionProduct, string> = {
  borrow: "dashboard-borrow-account",
  lend: "dashboard-lend-account",
  multiply: "dashboard-multiply-account",
  rewards: "dashboard-activity",
}

export function dashboardTabForProduct(product: ActionProduct): DashboardTabKey {
  return PRODUCT_TAB[product]
}

// The per-product account overviews live on the dashboard page. Keep a hash so
// action success CTAs can land on the exact reconciled account section.
export function dashboardHrefForProduct(product: ActionProduct): string {
  return `/dashboard#${PRODUCT_SECTION[product]}`
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
