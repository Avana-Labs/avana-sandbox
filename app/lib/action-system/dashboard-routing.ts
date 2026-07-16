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

const TAB_SECTION: Partial<Record<DashboardTabKey, string>> = {
  // The Lend Account section moved to the rewards page, so the lending tab no
  // longer has a dashboard section to scroll to — just its hero.
  overview: "dashboard-borrow-account",
  looping: "dashboard-multiply-account",
}

export function dashboardTabForProduct(product: ActionProduct): DashboardTabKey {
  return PRODUCT_TAB[product]
}

export function dashboardHrefForProduct(product: ActionProduct): string {
  return dashboardHrefForTab(dashboardTabForProduct(product))
}

export function dashboardHrefForTab(tab: DashboardTabKey): string {
  const section = TAB_SECTION[tab]
  return `/dashboard?tab=${tab}${section ? `#${section}` : ""}`
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

export function successDashboardCtaLabel(product: ActionProduct): string {
  return `View ${dashboardTabLabel(dashboardTabForProduct(product))} dashboard`
}
