import type { LendSystemState } from "@/app/lib/lend-engine"

type LendContextSession = {
  state: LendSystemState
}

export function lendWithdrawSelectItems(session: LendContextSession, walletId: string) {
  return Object.values(session.state.positions)
    .filter((position) => position.walletId === walletId && position.status === "active")
    .map((position) => {
      const market = session.state.markets[position.marketId]
      return {
        id: position.marketId,
        name: market?.asset.name ?? position.marketId,
        symbol: market?.asset.symbol ?? "Asset",
        trailingLabel: `${position.currentSuppliedAmount.toFixed(4)} supplied`,
      }
    })
}
