export type PortfolioActivityProduct = "borrow" | "pool" | "lend" | "multiply"

export type PortfolioActivityKind =
  | "supply"
  | "withdraw"
  | "borrow"
  | "repay"
  | "pledge"
  | "claim"
  | "open"
  | "addCollateral"
  | "reduce"
  | "close"
  | "rebalance"
  | "interest"
  | "liquidation"

export type PortfolioActivityStatus = "confirmed" | "pending" | "failed"

export type PortfolioActivityRow = {
  id: string
  at: string
  product: PortfolioActivityProduct
  kind: PortfolioActivityKind
  status: PortfolioActivityStatus
  amountLabel: string
  primaryLabel: string
  secondaryLabel: string
  txHash: string
  txHashShort: string
  txHref: string
}

export type PortfolioActivityQuery = {
  walletAddress: string
  limit?: number
  cursor?: string | null
  products?: PortfolioActivityProduct[]
  kinds?: PortfolioActivityKind[]
  statuses?: PortfolioActivityStatus[]
}

export type PortfolioActivityResponse = {
  walletAddress: string
  fetchedAt: string
  nextCursor: string | null
  items: PortfolioActivityRow[]
}
