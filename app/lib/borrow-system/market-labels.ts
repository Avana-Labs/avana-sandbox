import type { BorrowPoolRow } from "@/app/lib/borrow-sim"

/** Pair label shown on the borrow page (e.g. "WETH / USDC"). */
export function formatBorrowMarketLabel(market: Pick<BorrowPoolRow, "name">) {
  return market.name
}

/** Secondary context such as "Uniswap · 0.30%". */
export function formatBorrowMarketContext(market: Pick<BorrowPoolRow, "venue" | "feeTier">) {
  const venueLabel = market.venue.split(" · ")[0]?.trim() ?? market.venue
  return market.feeTier ? `${venueLabel} · ${market.feeTier}` : venueLabel
}
