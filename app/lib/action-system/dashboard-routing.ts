import type { ActionProduct } from "./contracts"

export type DashboardTabKey = "wallet" | "lend" | "borrow" | "multiply" | "referrals" | "rewards" | "transactions"

const PRODUCT_TAB: Record<ActionProduct, DashboardTabKey> = {
  borrow: "borrow",
  lend: "lend",
  multiply: "multiply",
  rewards: "wallet",
}

const VALID_TABS = new Set<DashboardTabKey>([
  "wallet",
  "lend",
  "borrow",
  "multiply",
  "referrals",
  "rewards",
  "transactions",
])

export function dashboardTabForProduct(product: ActionProduct): DashboardTabKey {
  return PRODUCT_TAB[product]
}

export function dashboardHrefForProduct(product: ActionProduct): string {
  return `/dashboard?tab=${PRODUCT_TAB[product]}`
}

export function parseDashboardTab(value: string | null | undefined): DashboardTabKey | null {
  if (!value) return null
  return VALID_TABS.has(value as DashboardTabKey) ? (value as DashboardTabKey) : null
}

export function successDashboardCtaLabel(_product: ActionProduct): string {
  return "View dashboard"
}
