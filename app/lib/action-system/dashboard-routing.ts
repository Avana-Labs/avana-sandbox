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

export function dashboardHrefForProduct(product: ActionProduct): string {
  return `/dashboard?tab=${dashboardTabForProduct(product)}`
}

export function dashboardTabLabel(tab: DashboardTabKey): string {
  return TAB_LABELS[tab]
}

export function parseDashboardTab(value: string | null | undefined): DashboardTabKey | null {
  if (value === "lending" || value === "overview" || value === "looping" || value === "activity") {
    return value
  }
  return null
}

export function successDashboardCtaLabel(product: ActionProduct): string {
  return `View ${dashboardTabLabel(dashboardTabForProduct(product))} dashboard`
}
