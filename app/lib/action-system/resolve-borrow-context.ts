import type { BorrowSystemState } from "@/app/lib/credit-engine"
import { formatFixed } from "@/app/lib/credit-engine"
import { formatActionUsd } from "@/app/lib/action-system/formatters"

type BorrowContextSession = {
  state: BorrowSystemState
  collateralPools: Array<{ id: string }>
  getBorrowableAssetsForMarket: (marketId?: string) => Array<{
    id: string
    name: string
    symbol: string
    borrowApr: number
  }>
  borrowableAssets: Array<{
    id: string
    name: string
    symbol: string
    borrowApr: number
  }>
}

export function resolveBorrowMarketForAsset(session: BorrowContextSession, assetId: string, preferredMarketId?: string) {
  const asset = session.state.assets[assetId]
  if (!asset) return preferredMarketId ?? session.collateralPools[0]?.id ?? ""

  if (preferredMarketId) {
    const preferred = session.state.markets[preferredMarketId]
    if (preferred?.relations.supportedBorrowAssetIds.includes(assetId)) {
      return preferredMarketId
    }
  }

  const collateralMatch = session.collateralPools.find((pool) => {
    const market = session.state.markets[pool.id]
    return market?.relations.supportedBorrowAssetIds.includes(assetId)
  })
  if (collateralMatch) return collateralMatch.id

  const market = Object.values(session.state.markets).find((entry) => entry.relations.supportedBorrowAssetIds.includes(assetId))
  return market?.id ?? preferredMarketId ?? session.collateralPools[0]?.id ?? ""
}

export function borrowSelectItemsForMarket(session: BorrowContextSession, marketId?: string) {
  const assets = marketId ? session.getBorrowableAssetsForMarket(marketId) : session.borrowableAssets
  return assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    trailingLabel: `${asset.borrowApr.toFixed(2)}% APY`,
  }))
}

export function repaySelectItemsForWallet(session: BorrowContextSession, walletId: string) {
  const account = session.state.accounts[walletId]
  if (!account) return []

  return account.debtPositions.map((position) => {
    const asset = session.state.assets[position.assetId]
    const debtUsd = Number.parseFloat(formatFixed(position.debtSharesUsd6, 6))

    return {
      id: position.id,
      name: asset?.display?.name ?? asset?.symbol ?? "Debt position",
      symbol: asset?.symbol ?? "Asset",
      trailingLabel: `${formatActionUsd(debtUsd)} owed`,
    }
  })
}
