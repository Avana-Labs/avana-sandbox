import type { LendAction, LendMarket, LendSystemState } from "@/app/lib/lend-engine"
import { getWalletLendAssets } from "@/app/lib/data/mock/wallet/portfolio/lend-wallet-assets"
import { buildLendCatalogMarketsRecord } from "./catalog"
import { resolveLendMarketId } from "./catalog"

function buildMockWalletBalances(walletId: string) {
  return {
    [walletId]: Object.fromEntries(
      getWalletLendAssets(walletId).map((token) => [resolveLendMarketId(token.symbol), token.balance]),
    ),
  }
}

export function buildMockLendSystemState(walletId = "demo-wallet", now = Date.UTC(2026, 5, 19)): LendSystemState {
  return {
    now,
    markets: buildLendCatalogMarketsRecord(now),
    positions: {},
    walletBalances: buildMockWalletBalances(walletId),
    transactions: [],
  }
}

export function buildMockLendMarket(marketId: string): LendMarket {
  const state = buildMockLendSystemState()
  const market = state.markets[marketId]
  if (!market) throw new Error(`Unknown lend market ${marketId}`)
  return market
}

export function buildMockLendSystemStateWithSeedPosition(walletId = "demo-wallet"): LendSystemState {
  const state = buildMockLendSystemState(walletId)
  const market = state.markets.eth
  if (!market) return state

  const principalAmount = 10
  const positionId = `${walletId}:${market.marketId}`

  state.positions[positionId] = {
    positionId,
    walletId,
    marketId: market.marketId,
    asset: market.asset.symbol,
    principalAmount,
    scaledBalance: principalAmount,
    liquidityIndexAtLastAction: market.liquidityIndex,
    currentSuppliedAmount: principalAmount,
    interestEarned: 0,
    rewardsEarnedUsd: 0,
    suppliedValueUsd: principalAmount * market.assetPriceUsd,
    openedAt: state.now - 86_400_000,
    updatedAt: state.now - 3_600_000,
    status: "active",
  }

  return state
}

export type { LendAction, LendSystemState }
