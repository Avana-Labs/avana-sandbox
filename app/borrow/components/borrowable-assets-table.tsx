"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DesktopTableSurface, HoverActionGroup } from "@/app/components/market-table-primitives"
import {
  BORROWABLE_CATEGORIES,
  aprToneClass,
  formatCompactUsd,
  utilizationToneClass,
  type BorrowableAsset,
} from "@/app/lib/data/borrow-domain"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { borrowAssetDetailPath } from "@/app/lib/borrow-routes"
import { formatApy } from "@/app/lib/format"
import { PillButton, TokenBubble, TokenSingleCell, TrendSpark } from "./atoms"
import { usePriceFor } from "@/app/lib/prices/token-prices-context"
import { formatTokenPrice } from "@/app/lib/prices/format"
import { cn } from "@/lib/utils"
import { resolveLendMarketId } from "@/app/lib/lend-system/catalog"

import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"

type BorrowableAssetsTableProps = {
  rows: BorrowableAsset[]
  onBorrow: (asset: BorrowableAsset) => void
  onViewMarket?: (asset: BorrowableAsset) => void
  groupByCategory?: boolean
  variant?: "default" | "loan"
}

// Live selector-derived utilization is an unrounded float; format it to 2dp for display,
// matching the fixed-decimal formatting used by the other cells (Borrow APR, USD figures).
function formatUtilizationPct(utilization: number): string {
  return `${utilization.toFixed(2)}%`
}


export function BorrowableAssetsPanel({
  rows,
  onBorrow,
  onViewMarket,
  groupByCategory = true,
  variant = "default",
}: BorrowableAssetsTableProps) {
  const router = useRouter()
  if (rows.length === 0) {
    return (
      <div className="rounded-radius-md border border-dashed border-border bg-surface-raised/50 px-6 py-10 text-center text-[13px] text-muted-foreground">
        No assets match your filter.
      </div>
    )
  }

  const groups = groupByCategory
    ? BORROWABLE_CATEGORIES.map((cat) => ({
        ...cat,
        assets: rows.filter((row) => row.category === cat.id),
      })).filter((group) => group.assets.length > 0)
    : [{ id: "all", label: "", dotClass: "", assets: rows }]

  return (
    <div>
      {variant === "loan" && !groupByCategory ? (
        <div className="hidden md:block">
          <LoanAssetsSection assets={rows} onBorrow={onBorrow} embedded />
        </div>
      ) : (
        <div className="hidden space-y-8 md:block">
          {groups.map((group) => (
            <AssetsSection
              key={group.id}
              label={group.label}
              dotClass={group.dotClass}
              assets={group.assets}
              onBorrow={onBorrow}
              hideHeader={!groupByCategory}
            />
          ))}
        </div>
      )}

      <div className="space-y-6 md:hidden">
        {groups.map((group) => (
          <section key={group.id} className="space-y-2">
            {groupByCategory ? (
              <div className="mb-1">
                <h3 className="text-[14px] font-medium tracking-tight">{group.label}</h3>
              </div>
            ) : null}
            <ul className="space-y-2">
              {group.assets.map((asset) => {
                const aprTone = aprToneClass(asset.borrowApr)
                return (
                  <li
                    key={asset.id}
                    className="cursor-pointer space-y-4 rounded-radius-lg border border-border bg-card px-4 py-4 shadow-elev-1 transition-colors hover:border-brand/30"
                    onClick={() => {
                      onViewMarket?.(asset)
                      router.push(borrowAssetDetailPath(asset.id))
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <TokenBubble visual={asset.visual} size="table" />
                        <div className="min-w-0">
                          <div className="text-[14px] font-medium text-foreground">{asset.symbol}</div>
                          <div className="text-[12px] text-muted-foreground">{asset.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("flex items-center justify-end gap-1 font-data text-[18px] font-medium tabular-nums", aprTone)}>
                          {asset.borrowApr.toFixed(2)}%
                        </div>
                        <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Borrow APR</div>
                      </div>
                    </div>

                    <dl className="divide-y divide-border text-[12.5px]">
                      <AssetStatLine label="Total Borrows" value={formatCompactUsd(asset.totalBorrowedUsd)} />
                      <AssetStatLine label="Liquidity" value={formatCompactUsd(asset.availableUsd)} />
                      <AssetStatLine
                        label="Utilization"
                        value={formatUtilizationPct(asset.utilization)}
                        tone={utilizationToneClass(asset.utilization)}
                      />
                    </dl>

                    <div className="flex items-stretch gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onBorrow(asset)
                        }}
                        className="w-full rounded-radius-sm bg-accent-primary px-4 py-2.5 text-center text-[13px] font-medium text-accent-primary-foreground shadow-elev-1 transition-colors hover:bg-accent-primary-hover"
                      >
                        Borrow
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function SortIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 16" fill="none" className="size-[14px] text-muted-foreground/70 dark:text-white/60">
      <path d="M4 5 6 3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 11 6 13l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LoanAssetsSection({
  assets,
  onBorrow,
  embedded = false,
}: {
  assets: BorrowableAsset[]
  onBorrow: (asset: BorrowableAsset) => void
  embedded?: boolean
}) {
  const [sortKey, setSortKey] = useState<"asset" | "apy" | "borrows" | "liquidity">("asset")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const priceFor = usePriceFor()
  const router = useRouter()

  const toggleSort = (nextKey: typeof sortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === "asset" ? "asc" : "desc")
  }

  const sortedAssets = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1

    return [...assets].sort((a, b) => {
      switch (sortKey) {
        case "apy":
          return (a.borrowApr - b.borrowApr) * direction
        case "borrows":
          return (a.totalBorrowedUsd - b.totalBorrowedUsd) * direction
        case "liquidity":
          return (a.availableUsd - b.availableUsd) * direction
        case "asset":
        default:
          return a.name.localeCompare(b.name) * direction
      }
    })
  }, [assets, sortDirection, sortKey])

  const table = (
    <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-[12px]">
            <thead>
              <tr className="bg-table-header text-left text-muted-foreground">
                <th className="pb-3 pt-4 pl-6 pr-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  #
                </th>
                <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("asset")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "asset"
                        ? "text-foreground dark:text-white/90"
                        : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>ASSET</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("apy")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "apy"
                        ? "text-foreground dark:text-white/90"
                        : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>BASE APY</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("borrows")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "borrows"
                        ? "text-foreground dark:text-white/90"
                        : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>TOTAL BORROWS</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 pr-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("liquidity")}
                    className={cn(
                      "flex w-full items-center gap-2 transition-colors",
                      sortKey === "liquidity"
                        ? "text-foreground dark:text-white/90"
                        : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>LIQUIDITY</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58" />
              </tr>
            </thead>

            <tbody key={`loan-${sortKey}-${sortDirection}-${sortedAssets.length}`}>
              {sortedAssets.map((asset, index) => (
                <tr
                  key={asset.id}
                  className="asset-swap group cursor-pointer transition-colors"
                  onClick={() => router.push(borrowAssetDetailPath(asset.id))}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <td className={`py-2.5 pl-6 pr-3 align-middle font-data text-[13px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}>
                    {index + 1}
                  </td>
                  <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
                    <div className="flex min-w-0 items-center gap-4">
                      <TokenBubble visual={asset.visual} size="table" ring={false} className="bg-transparent" />
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88 md:text-[15px]">
                          {asset.name}
                        </div>
                        <div className="mt-1 text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38 md:text-[13px]">
                          {(() => {
                            const price = priceFor(asset.symbol)
                            return price !== undefined ? formatTokenPrice(price) : asset.symbol
                          })()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`py-2.5 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[15px] ${TABLE_ROW_HOVER_BG}`}>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{asset.borrowApr.toFixed(2)}%</span>
                    </div>
                  </td>
                  <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
                    <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[15px]">
                      {formatCompactUsd(asset.totalBorrowedUsd)}
                    </div>
                  </td>
                  <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
                    <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[15px]">
                      {formatCompactUsd(asset.availableUsd)}
                    </div>
                  </td>
                  <td className={`py-2.5 px-5 text-right ${TABLE_ROW_HOVER_RIGHT}`}>
                    <HoverActionGroup className="inline-flex items-center">
                      <PillButton
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation()
                          const lendMarketId = resolveLendMarketId(asset.symbol)
                          if (!lendMarketId) return
                          router.push(actionPagePath("lend", "deposit", { market: lendMarketId, return: borrowAssetDetailPath(asset.id) }))
                        }}
                      >
                        Deposit
                      </PillButton>
                      <PillButton
                        variant="primary"
                        onClick={(event) => {
                          event.stopPropagation()
                          onBorrow(asset)
                        }}
                      >
                        Borrow
                      </PillButton>
                    </HoverActionGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
  )

  if (embedded) {
    return table
  }

  return (
    <section className="space-y-5">
    <DesktopTableSurface>{table}</DesktopTableSurface>
    </section>
  )
}

function AssetsSection({
  label,
  dotClass,
  assets,
  onBorrow,
  hideHeader = false,
}: {
  label: string
  dotClass: string
  assets: BorrowableAsset[]
  onBorrow: (asset: BorrowableAsset) => void
  hideHeader?: boolean
}) {
  const priceFor = usePriceFor()
  const router = useRouter()
  return (
    <section className="mb-2">
      {!hideHeader ? (
        <div className="mb-3">
          <h3 className="flex items-center gap-1.5 text-[14px] font-medium tracking-tight">
            <span className={cn("size-1.5 rounded-full", dotClass)} aria-hidden />
            {label}
          </h3>
        </div>
      ) : null}

      <DesktopTableSurface className="rounded-radius-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-[13px]">
            <thead>
              <tr className="bg-table-header text-left text-muted-foreground">
                <th className="pb-2 pt-3 pl-5 pr-3 text-[10.5px] font-medium uppercase tracking-[0.06em]">#</th>
                <th className="pb-2 pt-3 pl-5 text-[10.5px] font-medium uppercase tracking-[0.06em]">Asset</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Borrow APR</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Utilization</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Available</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Wallet Balance</th>
                <th className="w-20 pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">7D</th>
                <th className="w-44 pb-2 pt-3 pl-4 pr-5 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]" />
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, index) => (
                <tr key={asset.id} className="group cursor-pointer transition-colors" onClick={() => router.push(borrowAssetDetailPath(asset.id))}>
                  <td className={`py-2.5 pl-5 pr-3 align-middle font-data text-[13px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}>
                    {index + 1}
                  </td>
                  <td className={`py-2.5 pl-5 ${TABLE_ROW_HOVER_BG}`}>
                    <TokenSingleCell
                      visual={asset.visual}
                      name={asset.name}
                      subtitle={(() => {
                        const p = priceFor(asset.symbol)
                        return p !== undefined ? formatTokenPrice(p) : asset.subtitle
                      })()}
                      size="md"
                    />
                  </td>
                  <td className={`py-2.5 pl-4 text-right ${TABLE_ROW_HOVER_BG}`}>
                    <span className={cn("font-data text-[13px] font-medium tabular-nums", aprToneClass(asset.borrowApr))}>
                      {formatApy(asset.borrowApr)}
                    </span>
                  </td>
                  <td className={`py-2.5 pl-4 text-right ${TABLE_ROW_HOVER_BG}`}>
                    <span className={cn("font-data text-[13px] font-medium tabular-nums", utilizationToneClass(asset.utilization))}>
                      {formatUtilizationPct(asset.utilization)}
                    </span>
                  </td>
                  <td className={`py-2.5 pl-4 text-right font-data text-[13px] tabular-nums text-foreground ${TABLE_ROW_HOVER_BG}`}>
                    {formatCompactUsd(asset.availableUsd)}
                  </td>
                  <td className={cn("py-2.5 pl-4 text-right font-data text-[13px] tabular-nums", asset.hasWalletBalance ? "text-foreground" : "text-muted-foreground", TABLE_ROW_HOVER_BG)}>
                    {asset.walletBalanceLabel}
                  </td>
                  <td className={`py-2.5 pl-4 ${TABLE_ROW_HOVER_BG}`}>
                    <div className="flex justify-end">
                      <TrendSpark isPositive={asset.trendUp} seed={`asset-${asset.id}`} values={asset.trendValues} />
                    </div>
                  </td>
                  <td className={`py-2.5 pl-4 pr-5 text-right ${TABLE_ROW_HOVER_RIGHT}`}>
                    <HoverActionGroup className="inline-flex items-center">
                      <PillButton
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation()
                          const lendMarketId = resolveLendMarketId(asset.symbol)
                          if (!lendMarketId) return
                          router.push(actionPagePath("lend", "deposit", { market: lendMarketId, return: borrowAssetDetailPath(asset.id) }))
                        }}
                      >
                        Deposit
                      </PillButton>
                      <PillButton
                        variant="primary"
                        onClick={(event) => {
                          event.stopPropagation()
                          onBorrow(asset)
                        }}
                      >
                        Borrow
                      </PillButton>
                    </HoverActionGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DesktopTableSurface>
    </section>
  )
}

function AssetStatLine({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-data font-medium tabular-nums text-foreground", tone)}>{value}</dd>
    </div>
  )
}
