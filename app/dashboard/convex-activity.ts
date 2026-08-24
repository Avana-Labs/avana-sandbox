import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"
import type { PortfolioActivityKind, PortfolioActivityProduct } from "@/app/lib/data/providers/portfolio/records"

const PRODUCTS = new Set<PortfolioActivityProduct>([
  "borrow",
  "pool",
  "lend",
  "multiply",
  "onboarding",
  "rewards",
  "swap",
  "umbrella",
])

const KINDS = new Set<PortfolioActivityKind>([
  "swap",
  "supply",
  "withdraw",
  "borrow",
  "repay",
  "pledge",
  "claim",
  "stake",
  "startCooldown",
  "unstake",
  "open",
  "addCollateral",
  "reduce",
  "close",
  "rebalance",
  "interest",
  "liquidation",
])

export type ConvexActivityItem = {
  source: "transaction" | "sandboxActivity"
  id: string
  product: string
  kind: string
  status: string
  amountUsd: number
  marketSlug: string | null
  hash: string
  at: number
}

function mapProduct(product: string): PortfolioActivityProduct {
  if (PRODUCTS.has(product as PortfolioActivityProduct)) return product as PortfolioActivityProduct
  return "borrow"
}

function mapKind(kind: string): PortfolioActivityKind {
  if (kind === "deposit") return "supply"
  if (kind === "multiply") return "open"
  if (kind === "deleverage") return "reduce"
  if (KINDS.has(kind as PortfolioActivityKind)) return kind as PortfolioActivityKind
  return "rebalance"
}

function mapStatus(status: string): PortfolioActivityRow["status"] {
  if (status === "success" || status === "confirmed") return "confirmed"
  if (status === "pending") return "pending"
  return "failed"
}

function titleCase(value: string) {
  if (!value) return "Activity"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Map Convex `getActivity` rows into dashboard activity rows. */
export function mapConvexActivityItemsToRows(items: ConvexActivityItem[]): PortfolioActivityRow[] {
  return items.map((item) => {
    const legacyUmbrellaKind =
      item.product === "onboarding" && item.kind.startsWith("umbrella_") ? item.kind.slice("umbrella_".length) : null
    const isStarterAssetGrant = item.product === "onboarding" && item.kind === "starterAssetGrant"
    const isOnboardingClaim = item.product === "onboarding" && item.kind === "onboardingClaim"
    const product = legacyUmbrellaKind ? "umbrella" : mapProduct(item.product)
    const kind = isStarterAssetGrant || isOnboardingClaim ? "claim" : mapKind(legacyUmbrellaKind ?? item.kind)
    const primaryLabel = isOnboardingClaim
      ? "Sandbox portfolio funded"
      : isStarterAssetGrant
        ? item.marketSlug
          ? `${item.marketSlug.toUpperCase()} sandbox funds`
          : "Sandbox asset grant"
        : item.marketSlug
          ? item.marketSlug
          : product === "rewards"
            ? "Avana rewards"
            : titleCase(legacyUmbrellaKind ?? item.kind)
    const secondaryLabel = isOnboardingClaim
      ? "Onboarding grant"
      : isStarterAssetGrant
        ? "Sandbox funds received"
        : titleCase(legacyUmbrellaKind ?? item.kind)
    return {
      id: item.id,
      at: new Date(item.at).toISOString(),
      product,
      kind,
      status: mapStatus(item.status),
      amountUsd: item.amountUsd,
      primaryLabel,
      secondaryLabel,
      txHash: item.hash,
      marketId: item.marketSlug ?? undefined,
    }
  })
}

function logicalActivityKey(row: PortfolioActivityRow) {
  if (!row.txHash) return `id\u0000${row.id}`
  return `${row.txHash}\u0000${row.product}\u0000${row.kind}\u0000${row.marketId ?? ""}`
}

/** Merge seed (session) rows with Convex pages. Seed wins on id and logical-action collisions. */
export function mergeActivityRows(
  seedRows: PortfolioActivityRow[],
  convexRows: PortfolioActivityRow[],
): PortfolioActivityRow[] {
  const byId = new Map<string, PortfolioActivityRow>()
  for (const row of convexRows) byId.set(row.id, row)
  for (const row of seedRows) byId.set(row.id, row)
  const byAction = new Map<string, PortfolioActivityRow>()
  for (const row of byId.values()) byAction.set(logicalActivityKey(row), row)
  return [...byAction.values()].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}
