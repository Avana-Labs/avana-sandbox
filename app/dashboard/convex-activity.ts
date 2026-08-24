import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"
import type { PortfolioActivityKind, PortfolioActivityProduct } from "@/app/lib/data/providers/portfolio/records"

const PRODUCTS = new Set<PortfolioActivityProduct>([
  "borrow",
  "pool",
  "lend",
  "multiply",
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
  source: "transaction" | "onboarding"
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
  if (product === "onboarding") return "rewards"
  if (PRODUCTS.has(product as PortfolioActivityProduct)) return product as PortfolioActivityProduct
  return "borrow"
}

function mapKind(kind: string): PortfolioActivityKind {
  if (kind === "deposit") return "supply"
  if (kind === "multiply") return "open"
  if (kind === "deleverage") return "reduce"
  if (KINDS.has(kind as PortfolioActivityKind)) return kind as PortfolioActivityKind
  return "supply"
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
    const product = mapProduct(item.product)
    const kind = mapKind(item.kind)
    const primaryLabel = item.marketSlug
      ? item.marketSlug
      : product === "rewards"
        ? "Avana rewards"
        : titleCase(item.kind)
    return {
      id: item.id,
      at: new Date(item.at).toISOString(),
      product,
      kind,
      status: mapStatus(item.status),
      amountUsd: item.amountUsd,
      primaryLabel,
      secondaryLabel: titleCase(item.kind),
      txHash: item.hash,
    }
  })
}

/** Merge seed (session) rows with Convex pages. Seed wins on id collisions. */
export function mergeActivityRows(
  seedRows: PortfolioActivityRow[],
  convexRows: PortfolioActivityRow[],
): PortfolioActivityRow[] {
  const byId = new Map<string, PortfolioActivityRow>()
  for (const row of convexRows) byId.set(row.id, row)
  for (const row of seedRows) byId.set(row.id, row)
  return [...byId.values()].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}
