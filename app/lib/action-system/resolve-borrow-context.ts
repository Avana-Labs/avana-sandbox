import type { BorrowSystemState } from "@/app/lib/credit-engine"
import { formatFixed } from "@/app/lib/credit-engine"
import { formatActionUsd } from "@/app/lib/action-system/formatters"
import { buildHomeBorrowPreview, selectRewardClaimableTotals } from "@/app/lib/borrow-system/home-runtime"
import { formatBorrowMarketContext } from "@/app/lib/borrow-system/market-labels"
import { getWalletLpBalanceUsd } from "@/app/lib/borrow-system/wallet-lp-balances"
import { HOME_CLAIM_POSITIONS } from "@/app/lib/home-sim"
import { HOME_POOL_TO_MARKET_ID } from "@/app/lib/borrow-system/mock"

function normalizeBorrowAssetKey(value: string) {
  return value.trim().toLowerCase()
}

/** Map short route params (`usdc`) to scoped engine asset ids (`uni-v3-bluechip:usdc`). */
export function resolveBorrowAssetId(state: BorrowSystemState, rawAssetId: string, marketId?: string) {
  const trimmed = rawAssetId.trim()
  if (!trimmed) return trimmed
  if (state.assets[trimmed]) return trimmed

  const normalized = normalizeBorrowAssetKey(trimmed)
  const direct = Object.values(state.assets).find((asset) => normalizeBorrowAssetKey(asset.id) === normalized)
  if (direct) return direct.id

  if (marketId) {
    const market = state.markets[marketId]
    if (market) {
      const scoped = `${market.spokeId}:${normalized}`
      if (state.assets[scoped]) return scoped

      const supported = market.relations.supportedBorrowAssetIds.find((assetId) => {
        const asset = state.assets[assetId]
        if (!asset) return false
        return (
          normalizeBorrowAssetKey(asset.id) === normalized ||
          normalizeBorrowAssetKey(asset.baseAssetId) === normalized ||
          normalizeBorrowAssetKey(asset.symbol) === normalized
        )
      })
      if (supported) return supported
    }
  }

  const fallback = Object.values(state.assets).find((asset) => {
    return (
      normalizeBorrowAssetKey(asset.baseAssetId) === normalized ||
      normalizeBorrowAssetKey(asset.symbol) === normalized ||
      asset.id.toLowerCase().endsWith(`:${normalized}`)
    )
  })

  return fallback?.id ?? trimmed
}

type BorrowContextSession = {
  state: BorrowSystemState
  marketSummaries: Array<{
    id: string
    name: string
    venue: string
    feeTier: string
  }>
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

function assetAvailableUsd(state: BorrowSystemState, assetId: string) {
  const asset = state.assets[assetId]
  if (!asset) return null
  return Number.parseFloat(formatFixed(asset.snapshot.availableLiquidityUsd6, 6))
}

export function resolveBorrowMarketForAsset(session: BorrowContextSession, assetId: string, preferredMarketId?: string) {
  const resolvedAssetId = resolveBorrowAssetId(session.state, assetId, preferredMarketId)
  const asset = session.state.assets[resolvedAssetId]
  if (!asset) return preferredMarketId ?? session.collateralPools[0]?.id ?? ""

  if (preferredMarketId) {
    const preferred = session.state.markets[preferredMarketId]
    if (preferred?.relations.supportedBorrowAssetIds.includes(resolvedAssetId)) {
      return preferredMarketId
    }
  }

  const collateralMatch = session.collateralPools.find((pool) => {
    const market = session.state.markets[pool.id]
    return market?.relations.supportedBorrowAssetIds.includes(resolvedAssetId)
  })
  if (collateralMatch) return collateralMatch.id

  const market = Object.values(session.state.markets).find((entry) => entry.relations.supportedBorrowAssetIds.includes(resolvedAssetId))
  return market?.id ?? preferredMarketId ?? session.collateralPools[0]?.id ?? ""
}

export function supplySelectItemsForWallet(session: BorrowContextSession, walletId: string) {
  return session.marketSummaries
    .map((pool) => {
      const market = session.state.markets[pool.id]
      const walletLpUsd = getWalletLpBalanceUsd(walletId, pool.id)
      const visuals = market?.display.visuals ?? []
      return {
        id: pool.id,
        name: pool.name,
        symbol: visuals[0]?.symbol ?? pool.name.split("/")[0]?.trim() ?? "LP",
        pairSymbols: visuals.length >= 2 ? ([visuals[0]!.symbol, visuals[1]!.symbol] as [string, string]) : undefined,
        sublabel: formatBorrowMarketContext({ venue: pool.venue, feeTier: pool.feeTier }),
        trailingLabel: formatActionUsd(walletLpUsd),
        walletLpUsd,
      }
    })
    .filter((item) => item.walletLpUsd > 0)
    .map(({ walletLpUsd: _walletLpUsd, ...item }) => item)
}

export function borrowSelectItemsForMarket(
  session: BorrowContextSession,
  marketId: string | undefined,
  walletId: string,
) {
  const assets = marketId ? session.getBorrowableAssetsForMarket(marketId) : session.borrowableAssets
  return assets.map((asset) => {
    const spokePowerUsd =
      marketId != null
        ? buildHomeBorrowPreview(session.state, walletId, marketId, asset.id, 0).remainingBorrowPowerUsd
        : null
    const liquidityUsd = assetAvailableUsd(session.state, asset.id)
    const availableUsd =
      spokePowerUsd != null && liquidityUsd != null
        ? Math.min(spokePowerUsd, liquidityUsd)
        : spokePowerUsd
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
  const rewardPositions = account.rewardPositions ?? []
  const rewardById = Object.fromEntries(rewardPositions.map((position) => [position.id, position]))

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
