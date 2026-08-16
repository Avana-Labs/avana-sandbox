import type { ActionProduct } from "./contracts"

export type DashboardTabKey = "wallet" | "lend" | "borrow" | "multiply" | "referrals" | "rewards" | "transactions"

const PRODUCT_TAB: Record<ActionProduct, DashboardTabKey> = {
  borrow: "borrow",
  lend: "lend",
  multiply: "multiply",
  rewards: "wallet",
  umbrella: "wallet",
}

// Products that own a dedicated top-level surface get sent back there on
// action success — the dashboard tab doesn't reflect their positions yet.
const PRODUCT_SUCCESS_HREF: Partial<Record<ActionProduct, string>> = {
  umbrella: "/umbrella",
}

const PRODUCT_SUCCESS_LABEL: Partial<Record<ActionProduct, string>> = {
  umbrella: "Back to Umbrella",
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
  return PRODUCT_SUCCESS_HREF[product] ?? `/dashboard?tab=${PRODUCT_TAB[product]}`
}

export function parseDashboardTab(value: string | null | undefined): DashboardTabKey | null {
  if (!value) return null
  return VALID_TABS.has(value as DashboardTabKey) ? (value as DashboardTabKey) : null
}

export function successDashboardCtaLabel(product: ActionProduct): string {
  return PRODUCT_SUCCESS_LABEL[product] ?? "View dashboard"
}
