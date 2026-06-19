"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { parseFixed } from "@/app/lib/credit-engine"
import { useBorrowSession } from "@/app/lib/borrow-system/use-borrow-session"
import {
  filterPools,
  groupByDex,
  type BorrowDexId,
  type BorrowPoolRow,
  type BorrowableAsset,
  type HomeBorrowToken,
  type HomeCollateralPool,
} from "@/app/lib/data/borrow-domain"
import type { BorrowWorkspaceData } from "@/app/lib/data/providers/borrow"
import { triggerPageLoading } from "@/app/lib/page-loading"
import { TabsBar, isPoolTab, type BorrowTabId, type PoolTabId } from "./tabs-bar"
import { PoolsList, PoolsTable } from "./pools-table"
import { BorrowModal, type BorrowModalContext, type BorrowModalResult } from "./borrow-modal"
import { SupplyCollateralModal, type SupplyCollateralContext, type SupplyCollateralResult } from "./supply-collateral-modal"
import { type SupplyRowContext } from "./supplies-table"
import { useMediaQuery } from "@/app/lib/use-media-query"

function computeHealthFactor(pool: HomeCollateralPool, debt: number): number | null {
  if (debt <= 0) return Number.POSITIVE_INFINITY
  return pool.liquidationUsd / debt
}

const BTC_SYMBOLS = new Set(["WBTC", "CBBTC"])
const ETH_SYMBOLS = new Set(["ETH", "WETH", "STETH", "WSTETH", "RETH", "CBETH", "WEETH"])
const FOREX_SYMBOLS = new Set(["USDC", "USDT", "DAI", "CRVUSD", "GHO", "EURC", "USD+", "SDAI", "FRAX", "USDE", "USDS", "USDP", "LUSD", "TUSD", "MIM", "PYUSD", "EURS"])
const GOV_SYMBOLS = new Set(["AAVE", "UNI", "CRV", "LDO", "BAL", "AURA", "GNO"])
const SMART_SPOKES = new Set<string>([
  "uni-v2",
  "uni-v3-stable",
  "uni-v3-bluechip",
  "curve-crypto",
  "bal-weighted",
  "bal-boosted",
  "bal-reclamm",
  "aero-slipstream-bluechip",
])

function poolHasAnySymbol(pool: BorrowPoolRow, symbols: Set<string>) {
  return pool.visuals.some((visual) => symbols.has(visual.symbol.toUpperCase()))
}

function poolIsStable(pool: BorrowPoolRow) {
  return pool.visuals.every((visual) => FOREX_SYMBOLS.has(visual.symbol.toUpperCase()))
}

function poolMatchesTab(pool: BorrowPoolRow, tab: PoolTabId) {
  if (tab === "all-markets") return true
  if (tab === "btc") return poolHasAnySymbol(pool, BTC_SYMBOLS)
  if (tab === "eth") return poolHasAnySymbol(pool, ETH_SYMBOLS)
  if (tab === "forex") return poolIsStable(pool)
  if (tab === "governance") return poolHasAnySymbol(pool, GOV_SYMBOLS)
  if (tab === "smart-pools") {
    if (SMART_SPOKES.has(pool.spoke)) return true
    return !poolMatchesAnyCoreTab(pool)
  }
  return false
}

function poolMatchesAnyCoreTab(pool: BorrowPoolRow) {
  return (
    poolHasAnySymbol(pool, BTC_SYMBOLS) ||
    poolHasAnySymbol(pool, ETH_SYMBOLS) ||
    poolIsStable(pool) ||
    poolHasAnySymbol(pool, GOV_SYMBOLS)
  )
}

function toBorrowToken(asset: BorrowableAsset): HomeBorrowToken {
  return {
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    subtitle: asset.subtitle,
    borrowApr: asset.borrowApr,
    visual: {
      symbol: asset.visual.symbol,
      shortLabel: asset.visual.shortLabel,
      bgClassName: asset.visual.bgClass,
      textClassName: asset.visual.textClass,
    },
  }
}

export type BorrowWorkspaceProps = {
  pageData: BorrowWorkspaceData
  onTabChange?: (tab: BorrowTabId) => void
}

export function BorrowWorkspace({ pageData, onTabChange }: BorrowWorkspaceProps) {
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)", true)
  const { walletId, borrowSessionSeed, pendingRows, dexes } = pageData
  const session = useBorrowSession({
    walletId,
    sessionSeed: borrowSessionSeed,
  })
  const [currentTab, setCurrentTab] = useState<BorrowTabId>("all-markets")
  const [search, setSearch] = useState("")
  const [selectedDexes, setSelectedDexes] = useState<Set<BorrowDexId>>(() => new Set())

  const [borrowModal, setBorrowModal] = useState<{ open: boolean; context: BorrowModalContext | null }>({ open: false, context: null })
  const [supplyModal, setSupplyModal] = useState<{ open: boolean; context: SupplyCollateralContext | null }>({
    open: false,
    context: null,
  })

  // Data for each tab
  const supplies = useMemo<SupplyRowContext[]>(() => {
    return session.collateralPools.map((pool) => ({
      pool,
      borrowedUsd: session.initialDebts[pool.id] ?? 0,
      remainingBorrowPowerUsd: Math.max(0, pool.borrowPowerUsd - (session.initialDebts[pool.id] ?? 0)),
      liquidationThresholdUsd: pool.liquidationUsd,
      healthFactor: computeHealthFactor(pool, session.initialDebts[pool.id] ?? 0),
      pairApr: pool.pairApr,
      feesUsd: 0,
      feesLabel: "$0.00",
    }))
  }, [session.collateralPools, session.initialDebts])

  const filteredPools = useMemo(() => {
    return filterPools([...session.marketSummaries], { text: search, dexes: selectedDexes })
  }, [search, selectedDexes, session.marketSummaries])

  const visiblePools = useMemo(() => {
    if (!isPoolTab(currentTab)) return []
    return filteredPools.filter((pool) => poolMatchesTab(pool, currentTab))
  }, [currentTab, filteredPools])

  const poolGroups = useMemo(() => groupByDex(visiblePools), [visiblePools])
  const borrowAssetsBySpoke = useMemo(() => {
    const symbolMap = new Map(session.borrowableAssets.map((asset) => [asset.symbol.toUpperCase(), asset]))
    return Object.fromEntries(
      poolGroups.flatMap((group) =>
        group.spokes.map((entry) => {
          const symbols = new Set(entry.rows.flatMap((row) => row.borrowableTokens.map((token) => token.symbol.toUpperCase())))
          return [entry.spoke.id, Array.from(symbols).map((symbol) => symbolMap.get(symbol)).filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))]
        }),
      ),
    ) as Record<string, BorrowableAsset[]>
  }, [poolGroups, session.borrowableAssets])

  useEffect(() => {
    onTabChange?.(currentTab)
  }, [currentTab, onTabChange])

  const handlePoolsSupply = useCallback((pool: BorrowPoolRow) => {
    setSupplyModal({ open: true, context: { pool } })
  }, [])

  const handleAssetBorrowDesktop = useCallback(
    (asset: BorrowableAsset) => {
      triggerPageLoading()
      router.push(`/borrow/assets/${asset.id}`)
    },
    [router],
  )

  const handleAssetBorrowMobile = useCallback(
    (asset: BorrowableAsset) => {
      const best = supplies
        .filter((row) => Number.isFinite(row.healthFactor ?? NaN) || row.borrowedUsd === 0)
        .reduce<SupplyRowContext | null>((acc, row) => {
          if (!acc) return row
          const rowScore = Number.isFinite(row.healthFactor ?? NaN) ? (row.healthFactor as number) : 99
          const accScore = Number.isFinite(acc.healthFactor ?? NaN) ? (acc.healthFactor as number) : 99
          return rowScore >= accScore ? row : acc
        }, null)
      const fallback = best ?? supplies[0]
      if (!fallback) return
      setBorrowModal({
        open: true,
        context: {
          pool: fallback.pool,
          currentDebtUsd: fallback.borrowedUsd,
          defaultTokenId: asset.id,
          tokenOptions: session.getBorrowableAssetsForMarket(fallback.pool.id).map(toBorrowToken),
        },
      })
    },
    [session, supplies],
  )

  const handleBorrowConfirm = useCallback((result: BorrowModalResult) => {
    session.dispatch({
      type: "borrow",
      walletId,
      marketId: result.pool.id,
      assetId: result.token.id,
      amountUsd6: parseFixed(result.amountUsd.toFixed(6), 6),
    })
  }, [session, walletId])

  const handleSupplyConfirm = useCallback((result: SupplyCollateralResult) => {
    session.dispatch({
      type: "supplyCollateral",
      walletId,
      marketId: result.pool.id,
      amountUsd6: parseFixed(result.amountUsd.toFixed(6), 6),
    })
  }, [session, walletId])

  return (
    <section className="pb-16">
      <TabsBar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        search={search}
        onSearchChange={setSearch}
        dexes={dexes}
        selectedDexes={selectedDexes}
        onDexChange={(dex) => setSelectedDexes(dex ? new Set([dex]) : new Set())}
      />

      <div className="pt-3 pb-6">
        {isPoolTab(currentTab) ? (
          <>
            {isDesktop ? (
              <PoolsTable
                groups={poolGroups}
                borrowAssetsBySpoke={borrowAssetsBySpoke}
                pending={pendingRows}
                onUseAsCollateral={handlePoolsSupply}
                onBorrowAssetDesktop={handleAssetBorrowDesktop}
                onBorrowAssetMobile={handleAssetBorrowMobile}
              />
            ) : (
              <PoolsList
                groups={poolGroups}
                borrowAssetsBySpoke={borrowAssetsBySpoke}
                pending={pendingRows}
                onUseAsCollateral={handlePoolsSupply}
                onBorrowAssetDesktop={handleAssetBorrowDesktop}
                onBorrowAssetMobile={handleAssetBorrowMobile}
              />
            )}
          </>
        ) : null}
      </div>

      <BorrowModal
        open={borrowModal.open}
        context={borrowModal.context}
        onClose={() => setBorrowModal({ open: false, context: null })}
        onConfirm={handleBorrowConfirm}
      />

      <SupplyCollateralModal
        open={supplyModal.open}
        context={supplyModal.context}
        onClose={() => setSupplyModal({ open: false, context: null })}
        onConfirm={handleSupplyConfirm}
      />
    </section>
  )
}
