import type { BorrowSystemState } from "@/app/lib/credit-engine"
import { formatFixed } from "@/app/lib/credit-engine"
import { formatActionUsd } from "@/app/lib/action-system/formatters"
import { buildHomeBorrowPreview, selectRewardClaimableTotals } from "@/app/lib/borrow-system/home-runtime"
import { HOME_CLAIM_POSITIONS } from "@/app/lib/home-sim"
import { HOME_POOL_TO_MARKET_ID } from "@/app/lib/borrow-system/mock"

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

export function borrowSelectItemsForMarket(
  session: BorrowContextSession,
  marketId: string | undefined,
  walletId: string,
) {
  const assets = marketId ? session.getBorrowableAssetsForMarket(marketId) : session.borrowableAssets
  return assets.map((asset) => {
    const availableUsd =
      marketId != null
        ? buildHomeBorrowPreview(session.state, walletId, marketId, asset.id, 0).remainingBorrowPowerUsd
        : null
    return {
      id: asset.id,
      name: asset.name,
      symbol: asset.symbol,
      trailingLabel: availableUsd != null ? `${formatActionUsd(availableUsd)} available` : `${asset.borrowApr.toFixed(2)}% APY`,
    }
  })
}

export function claimSelectItemsForWallet(session: BorrowContextSession, walletId: string) {
  const account = session.state.accounts[walletId]
  if (!account) return []

  const claimableById = selectRewardClaimableTotals(session.state, walletId)
  const rewardById = Object.fromEntries(account.rewardPositions.map((position) => [position.id, position]))

  return HOME_CLAIM_POSITIONS.map((position) => {
    const reward = rewardById[position.id]
    const engineClaimable = claimableById[position.id]
    const claimableUsd = reward
      ? Number.parseFloat(formatFixed(reward.claimableUsd6, 6))
      : engineClaimable != null && engineClaimable > 0
        ? engineClaimable
        : position.totalUsd

    return {
      id: position.id,
      name: position.name,
      symbol: position.name.split("/")[0]?.trim() ?? "Rewards",
      trailingLabel: `${formatActionUsd(Math.max(0, claimableUsd))} claimable`,
      claimableUsd: Math.max(0, claimableUsd),
    }
  }).filter((item) => item.claimableUsd > 0)
}

export function resolveClaimMarketId(marketOrPoolId: string) {
  return HOME_POOL_TO_MARKET_ID[marketOrPoolId] ?? marketOrPoolId
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
