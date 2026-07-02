import type { LendSystemState } from "@/app/lib/lend-engine"
import { formatActionApproxUsd, formatActionRatioPercent } from "@/app/lib/action-system/formatters"
import { formatLendMarketDropdownSublabel } from "@/app/lib/lend-system/market-labels"
import { getWalletBalanceForLendMarket } from "@/app/lib/lend-system/wallet-balances"

type LendContextSession = {
  state: LendSystemState
}

export function lendDepositSelectItems(session: LendContextSession, walletId: string) {
  return Object.values(session.state.markets)
    .map((market) => {
      const walletBalance = getWalletBalanceForLendMarket(session.state, walletId, market)
      const balanceUsd = walletBalance * market.assetPriceUsd
      return {
        id: market.marketId,
        name: market.asset.name,
        symbol: market.asset.symbol,
        sublabel: formatLendMarketDropdownSublabel(market.asset.symbol),
        trailingLabel: formatActionApproxUsd(balanceUsd),
        trailingSublabel: `${formatActionRatioPercent(market.supplyApy)} APY`,
        walletBalance,
      }
    })
    .filter((item) => item.walletBalance > 0)
    .map(({ walletBalance: _walletBalance, ...item }) => item)
}

export function lendWithdrawSelectItems(session: LendContextSession, walletId: string) {
  return Object.values(session.state.positions)
    .filter((position) => position.walletId === walletId && position.status === "active")
    .map((position) => {
      const market = session.state.markets[position.marketId]
      const suppliedUsd = position.currentSuppliedAmount * (market?.assetPriceUsd ?? 0)
      return {
        id: position.marketId,
        name: market?.asset.name ?? position.marketId,
        symbol: market?.asset.symbol ?? "Asset",
        sublabel: market ? formatLendMarketDropdownSublabel(market.asset.symbol) : undefined,
        trailingLabel: formatActionApproxUsd(suppliedUsd),
        trailingSublabel: `${position.currentSuppliedAmount.toFixed(4)} supplied`,
      }
    })
}
