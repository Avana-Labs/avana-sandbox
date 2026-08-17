"use client"

import { memo, useMemo, useState } from "react"
import { ActionIcon } from "@/app/components/action-icon"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { formatTokenQuantity } from "@/app/lib/currency/format"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { DesktopTableSurface, HoverActionGroup } from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobilePrimaryAction,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import {
  BORROWABLE_CATEGORIES,
  aprToneClass,
  utilizationToneClass,
  type BorrowableAsset,
} from "@/app/lib/data/borrow-domain"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { borrowAssetDetailPath } from "@/app/lib/borrow-routes"
import { formatApy } from "@/app/lib/format"
import { TokenBubble, TokenSingleCell, TrendSpark } from "./atoms"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"
import { formatTokenPrice } from "@/app/lib/prices/format"
import { cn } from "@/lib/utils"
import { resolveLendMarketId } from "@/app/lib/lend-system/catalog"
import { Button } from "@/components/ui/button"

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
  const { t } = useTranslation()
  if (rows.length === 0) {
    return (
      <div className="rounded-radius-md border border-dashed border-border bg-surface-raised/50 px-6 py-10 text-center text-[13px] text-muted-foreground">
        {t("No assets match your filter.")}
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
              {group.assets.map((asset, index) => (
                <BorrowableMobileCardRow
                  key={asset.id}
                  asset={asset}
                  index={index}
                  onBorrow={onBorrow}
                  onViewMarket={onViewMarket}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

// Memoized so an unchanged card doesn't re-render when a sibling row's data changes.
// Reads router/currency/translation from hooks internally, keeping props to stable
// primitives + references (asset, index, callbacks) so React.memo can bail out.
const BorrowableMobileCardRow = memo(function BorrowableMobileCardRow({
  asset,
  index,
  onBorrow,
  onViewMarket,
}: {
  asset: BorrowableAsset
  index: number
  onBorrow: (asset: BorrowableAsset) => void
  onViewMarket?: (asset: BorrowableAsset) => void
}) {
  const router = useRouter()
  const { compact } = useCurrency()
  const { t } = useTranslation()
  const aprTone = aprToneClass(asset.borrowApr)
  return (
    <li>
      <MarketMobileCard
        clickable
        onClick={() => {
          onViewMarket?.(asset)
          router.push(borrowAssetDetailPath(asset.id))
        }}
      >
        <MarketMobileCardHeader
          identity={
            <div className="flex items-center gap-2.5">
              <TokenBubble visual={asset.visual} size="table" eager={index < 2} />
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-foreground">{asset.symbol}</div>
                <div className="text-[12px] text-muted-foreground">{asset.name}</div>
              </div>
            </div>
          }
          metric={
            <MarketMobileMetric
              value={`${asset.borrowApr.toFixed(2)}%`}
              label={t("Borrow APR")}
              valueClassName={aprTone}
            />
          }
        />

        <MarketMobileStatList className="mt-4">
          <MarketMobileStatRow label={t("Total Borrows")} value={compact(asset.totalBorrowedUsd)} />
          <MarketMobileStatRow label={t("Available")} value={compact(asset.availableUsd)} />
          <MarketMobileStatRow
            label={t("Utilization")}
            value={formatUtilizationPct(asset.utilization)}
            valueClassName={utilizationToneClass(asset.utilization)}
          />
        </MarketMobileStatList>

        <MarketMobilePrimaryAction
          onClick={(event) => {
            event.stopPropagation()
            onBorrow(asset)
          }}
        >
          <ActionIcon label="Borrow" />
          {t("Borrow")}
        </MarketMobilePrimaryAction>
      </MarketMobileCard>
    </li>
  )
})

function SortIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 16"
      fill="none"
      className="size-[14px] text-muted-foreground/70 dark:text-white/60"
    >
      <path d="M4 5 6 3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 11 6 13l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Memoized loan-variant row: reads price via the reactive `useCanonicalPriceFor` hook
// and pulls router/currency/translation from hooks internally, so the only props are
// stable (asset, index, onBorrow) and React.memo can skip unchanged rows.
const LoanAssetsRow = memo(function LoanAssetsRow({
  asset,
  index,
  onBorrow,
}: {
  asset: BorrowableAsset
  index: number
  onBorrow: (asset: BorrowableAsset) => void
}) {
  const priceFor = useCanonicalPriceFor()
  const router = useRouter()
  const { compact } = useCurrency()
  const { t } = useTranslation()
  return (
    <tr
      className="asset-swap group cursor-pointer transition-colors"
      onClick={() => router.push(borrowAssetDetailPath(asset.id))}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <td
        className={`py-2.5 pl-6 pr-3 align-middle font-data text-[13px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}
      >
        {index + 1}
      </td>
      <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="flex min-w-0 items-center gap-4">
          <TokenBubble visual={asset.visual} size="table" ring={false} className="bg-transparent" eager={index < 2} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[15px]">
              {asset.name}
            </div>
            <div className="mt-1 text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38 md:text-[13px]">
              {asset.symbol}
            </div>
          </div>
        </div>
      </td>
      <td
        className={`py-2.5 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white md:text-[15px] ${TABLE_ROW_HOVER_BG}`}
      >
        <div className="flex items-center gap-2">
          <span className="tabular-nums">{asset.borrowApr.toFixed(2)}%</span>
        </div>
      </td>
      <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white md:text-[15px]">
          <span className="tabular-nums">
            {formatTokenQuantity(asset.totalBorrowedUsd / (priceFor(asset.symbol) ?? 1), asset.symbol)}
          </span>
        </div>
        <div className="mt-0.5 text-[13px] tracking-[-0.03em] text-muted-foreground">
          <span className="tabular-nums">{compact(asset.totalBorrowedUsd)}</span>
        </div>
      </td>
      <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white md:text-[15px]">
          <span className="tabular-nums">
            {formatTokenQuantity(asset.availableUsd / (priceFor(asset.symbol) ?? 1), asset.symbol)}
          </span>
        </div>
        <div className="mt-0.5 text-[13px] tracking-[-0.03em] text-muted-foreground">
          <span className="tabular-nums">{compact(asset.availableUsd)}</span>
        </div>
      </td>
      <td className={`py-2.5 px-5 text-right ${TABLE_ROW_HOVER_RIGHT}`}>
        <HoverActionGroup className="gap-2">
          <Button
            type="button"
            size="table"
            variant="table-primary"
            className="w-auto"
            onClick={(event) => {
              event.stopPropagation()
              const lendMarketId = resolveLendMarketId(asset.symbol)
              if (!lendMarketId) return
              router.push(
                actionPagePath("lend", "deposit", {
                  market: lendMarketId,
                  return: borrowAssetDetailPath(asset.id),
                }),
              )
            }}
          >
            <ActionIcon label="Deposit" />
            {t("Deposit")}
          </Button>
          <Button
            type="button"
            size="table"
            variant="table-secondary"
            className="w-auto"
            onClick={(event) => {
              event.stopPropagation()
              onBorrow(asset)
            }}
          >
            <ActionIcon label="Borrow" />
            {t("Borrow")}
          </Button>
        </HoverActionGroup>
      </td>
    </tr>
  )
})

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
  const { t } = useTranslation()

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
            <th className="pb-2 pt-2.5 pl-6 pr-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              #
            </th>
            <th className="pb-2 pt-2.5 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              <button
                type="button"
                onClick={() => toggleSort("asset")}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  sortKey === "asset"
                    ? "text-foreground dark:text-white"
                    : "text-muted-foreground/70 dark:text-white/42",
                )}
              >
                <span>{t("ASSET")}</span>
                <SortIcon />
              </button>
            </th>
            <th className="pb-2 pt-2.5 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              <button
                type="button"
                onClick={() => toggleSort("apy")}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  sortKey === "apy" ? "text-foreground dark:text-white" : "text-muted-foreground/70 dark:text-white/42",
                )}
              >
                <span>{t("BORROW APY")}</span>
                <SortIcon />
              </button>
            </th>
            <th className="pb-2 pt-2.5 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              <button
                type="button"
                onClick={() => toggleSort("borrows")}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  sortKey === "borrows"
                    ? "text-foreground dark:text-white"
                    : "text-muted-foreground/70 dark:text-white/42",
                )}
              >
                <span>{t("TOTAL BORROWS")}</span>
                <SortIcon />
              </button>
            </th>
            <th className="pb-2 pt-2.5 px-4 pr-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              <button
                type="button"
                onClick={() => toggleSort("liquidity")}
                className={cn(
                  "flex w-full items-center gap-2 transition-colors",
                  sortKey === "liquidity"
                    ? "text-foreground dark:text-white"
                    : "text-muted-foreground/70 dark:text-white/42",
                )}
              >
                <span>{t("AVAILABLE")}</span>
                <SortIcon />
              </button>
            </th>
            <th className="pb-2 pt-2.5 px-4 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58" />
          </tr>
        </thead>

        <tbody key={`loan-${sortKey}-${sortDirection}-${sortedAssets.length}`}>
          {sortedAssets.map((asset, index) => (
            <LoanAssetsRow key={asset.id} asset={asset} index={index} onBorrow={onBorrow} />
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

// Memoized grouped-variant row. Price comes from the reactive `useCanonicalPriceFor`
// hook; router/currency/translation are read from hooks internally so the props stay
// stable (asset, index, onBorrow) and React.memo can bail out of unchanged rows.
const AssetsRow = memo(function AssetsRow({
  asset,
  index,
  onBorrow,
}: {
  asset: BorrowableAsset
  index: number
  onBorrow: (asset: BorrowableAsset) => void
}) {
  const priceFor = useCanonicalPriceFor()
  const router = useRouter()
  const { compact } = useCurrency()
  const { t } = useTranslation()
  return (
    <tr className="group cursor-pointer transition-colors" onClick={() => router.push(borrowAssetDetailPath(asset.id))}>
      <td
        className={`py-2.5 pl-5 pr-3 align-middle font-data text-[13px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}
      >
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
          eager={index < 2}
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
        {compact(asset.availableUsd)}
      </td>
      <td
        className={cn(
          "py-2.5 pl-4 text-right font-data text-[13px] tabular-nums",
          asset.hasWalletBalance ? "text-foreground" : "text-muted-foreground",
          TABLE_ROW_HOVER_BG,
        )}
      >
        {asset.walletBalanceLabel}
      </td>
      <td className={`py-2.5 pl-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="flex justify-end">
          <TrendSpark isPositive={asset.trendUp} seed={`asset-${asset.id}`} values={asset.trendValues} />
        </div>
      </td>
      <td className={`py-2.5 pl-4 pr-5 text-right ${TABLE_ROW_HOVER_RIGHT}`}>
        <HoverActionGroup className="gap-2">
          <Button
            type="button"
            size="table"
            variant="table-primary"
            className="w-auto"
            onClick={(event) => {
              event.stopPropagation()
              const lendMarketId = resolveLendMarketId(asset.symbol)
              if (!lendMarketId) return
              router.push(
                actionPagePath("lend", "deposit", {
                  market: lendMarketId,
                  return: borrowAssetDetailPath(asset.id),
                }),
              )
            }}
          >
            <ActionIcon label="Deposit" />
            {t("Deposit")}
          </Button>
          <Button
            type="button"
            size="table"
            variant="table-secondary"
            className="w-auto"
            onClick={(event) => {
              event.stopPropagation()
              onBorrow(asset)
            }}
          >
            <ActionIcon label="Borrow" />
            {t("Borrow")}
          </Button>
        </HoverActionGroup>
      </td>
    </tr>
  )
})

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
  const { t } = useTranslation()
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
                <th className="pb-2 pt-2.5 pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  #
                </th>
                <th className="pb-2 pt-2.5 pl-5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Asset")}
                </th>
                <th className="pb-2 pt-2.5 pl-4 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Borrow APR")}
                </th>
                <th className="pb-2 pt-2.5 pl-4 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Utilization")}
                </th>
                <th className="pb-2 pt-2.5 pl-4 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Available")}
                </th>
                <th className="pb-2 pt-2.5 pl-4 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Wallet Balance")}
                </th>
                <th className="w-20 pb-2 pt-2.5 pl-4 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  7D
                </th>
                <th className="w-44 pb-2 pt-2.5 pl-4 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58" />
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, index) => (
                <AssetsRow key={asset.id} asset={asset} index={index} onBorrow={onBorrow} />
              ))}
            </tbody>
          </table>
        </div>
      </DesktopTableSurface>
    </section>
  )
}
