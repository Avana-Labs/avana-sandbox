"use client"

import { memo, useMemo, useState } from "react"
import Link from "next/link"
import { ActionIcon } from "@/app/components/action-icon"
import { CapacityFilled } from "@/app/components/capacity-filled"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { formatTokenQuantity } from "@/app/lib/currency/format"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import {
  DesktopTableSurface,
  HoverActionGroup,
  ScrollableTable,
  SortHeaderButton,
} from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileActionFooter,
  MarketMobileCardHeader,
  MarketMobileIdentityText,
  MarketMobileMetric,
  MarketMobilePrimaryAction,
  MarketMobileSecondaryAction,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { BORROWABLE_CATEGORIES, aprToneClass, type BorrowableAsset } from "@/app/lib/data/borrow-domain"
import { borrowAssetDetailPath } from "@/app/lib/borrow-routes"
import { formatApy } from "@/app/lib/format"
import { TokenBubble, TokenSingleCell, TrendSpark } from "./atoms"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"
import { formatTokenPrice } from "@/app/lib/prices/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import {
  TABLE_ACTION_BUTTON,
  TABLE_BODY_ROW,
  TABLE_CELL_INDEX,
  TABLE_CELL_NUMERIC,
  TABLE_CELL_PADDING,
  TABLE_CELL_PADDING_LEADING,
  TABLE_CELL_PADDING_TRAILING,
  TABLE_CELL_PRIMARY,
  TABLE_CELL_SECONDARY,
  TABLE_HEADER_CELL,
  TABLE_HEADER_ROW,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
  tableColumnLayout,
  tableStickyCell,
} from "@/app/lib/ui/table-row-hover"

type BorrowableAssetsTableProps = {
  rows: BorrowableAsset[]
  onBorrow: (asset: BorrowableAsset) => void
  onViewMarket?: (asset: BorrowableAsset) => void
  groupByCategory?: boolean
  variant?: "default" | "loan"
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
              <MarketMobileIdentityText title={asset.symbol} subtitle={asset.name} />
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
          <MarketMobileStatRow label={t("Capacity Filled")} value={<CapacityFilled value={asset.utilization} />} />
          <MarketMobileStatRow label={t("Available")} value={compact(asset.availableUsd)} />
        </MarketMobileStatList>

        <MarketMobileActionFooter>
          <MarketMobilePrimaryAction
            className="mt-0"
            onClick={(event) => {
              event.stopPropagation()
              onBorrow(asset)
            }}
          >
            <ActionIcon label="Borrow" />
            {t("Borrow")}
          </MarketMobilePrimaryAction>
          <MarketMobileSecondaryAction
            onClick={(event) => {
              event.stopPropagation()
              onViewMarket?.(asset)
              router.push(borrowAssetDetailPath(asset.id))
            }}
          >
            <ActionIcon label="Manage" />
            {t("Manage")}
          </MarketMobileSecondaryAction>
        </MarketMobileActionFooter>
      </MarketMobileCard>
    </li>
  )
})

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
      className={`${TABLE_BODY_ROW} group cursor-pointer transition-colors`}
      onClick={() => router.push(borrowAssetDetailPath(asset.id))}
    >
      <td className={cn(TABLE_CELL_PADDING_LEADING, TABLE_CELL_INDEX, TABLE_ROW_HOVER_BG)}>{index + 1}</td>
      <td className={cn(TABLE_CELL_PADDING, tableStickyCell("body"))}>
        {/* Real anchor on the primary cell: crawlable, copyable, and keyboard-focusable (Enter
            navigates natively). stopPropagation keeps the row's own onClick from double-firing. */}
        <Link
          href={borrowAssetDetailPath(asset.id)}
          onClick={(event) => event.stopPropagation()}
          className="flex min-w-0 items-center gap-4 rounded-radius-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <TokenBubble visual={asset.visual} size="table" ring={false} className="bg-transparent" eager={index < 2} />
          <div className="min-w-0">
            <div className={cn("truncate", TABLE_CELL_PRIMARY)}>{asset.name}</div>
            <div className={cn("truncate tabular-nums", TABLE_CELL_SECONDARY)}>
              {compact(asset.totalBorrowedUsd + asset.availableUsd)} {t("Supply")}
            </div>
          </div>
        </Link>
      </td>
      <td className={cn(TABLE_CELL_PADDING, TABLE_CELL_NUMERIC, TABLE_ROW_HOVER_BG)}>{asset.borrowApr.toFixed(2)}%</td>
      <td className={cn(TABLE_CELL_PADDING, TABLE_ROW_HOVER_BG)}>
        <div className={TABLE_CELL_NUMERIC}>
          {formatTokenQuantity(asset.totalBorrowedUsd / (priceFor(asset.symbol) ?? 1), asset.symbol)}
        </div>
        <div className={cn(TABLE_CELL_SECONDARY, "tabular-nums")}>{compact(asset.totalBorrowedUsd)}</div>
      </td>
      <td className={cn(TABLE_CELL_PADDING, TABLE_ROW_HOVER_BG)}>
        <CapacityFilled value={asset.utilization} />
      </td>
      <td className={cn(TABLE_CELL_PADDING, TABLE_ROW_HOVER_BG)}>
        <div className={TABLE_CELL_NUMERIC}>
          {formatTokenQuantity(asset.availableUsd / (priceFor(asset.symbol) ?? 1), asset.symbol)}
        </div>
        <div className={cn(TABLE_CELL_SECONDARY, "tabular-nums")}>{compact(asset.availableUsd)}</div>
      </td>
      <td className={cn(TABLE_CELL_PADDING_TRAILING, "text-right", TABLE_ROW_HOVER_RIGHT)}>
        <HoverActionGroup className="gap-2">
          <Button
            type="button"
            size="table"
            variant="table-secondary"
            className={TABLE_ACTION_BUTTON}
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

const LOAN_TABLE_LAYOUT = tableColumnLayout([
  "index",
  "identity",
  "compact", // Borrow APY
  "metric", // Total borrows
  "gauge", // Capacity filled
  "metric", // Available
  "action",
])

function LoanAssetsSection({
  assets,
  onBorrow,
  embedded = false,
}: {
  assets: BorrowableAsset[]
  onBorrow: (asset: BorrowableAsset) => void
  embedded?: boolean
}) {
  const [sortKey, setSortKey] = useState<"asset" | "apy" | "borrows" | "capacityFilled" | "liquidity">("asset")
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
        case "capacityFilled":
          return (a.utilization - b.utilization) * direction
        case "liquidity":
          return (a.availableUsd - b.availableUsd) * direction
        case "asset":
        default:
          return a.name.localeCompare(b.name) * direction
      }
    })
  }, [assets, sortDirection, sortKey])

  const sortHeader = (key: typeof sortKey, label: string) => (
    <SortHeaderButton label={label} active={sortKey === key} onClick={() => toggleSort(key)} />
  )

  const table = (
    <ScrollableTable layout={LOAN_TABLE_LAYOUT}>
      <thead>
        <tr className={TABLE_HEADER_ROW}>
          <th className={cn(TABLE_HEADER_CELL, "pl-6 pr-3")}>#</th>
          <th className={cn(TABLE_HEADER_CELL, "px-4", tableStickyCell("header"))}>
            {sortHeader("asset", t("Asset"))}
          </th>
          <th className={cn(TABLE_HEADER_CELL, "px-4")}>{sortHeader("apy", t("Borrow APY"))}</th>
          <th className={cn(TABLE_HEADER_CELL, "px-4")}>{sortHeader("borrows", t("Total Borrows"))}</th>
          <th className={cn(TABLE_HEADER_CELL, "px-4")}>{sortHeader("capacityFilled", t("Capacity Filled"))}</th>
          <th className={cn(TABLE_HEADER_CELL, "px-4")}>{sortHeader("liquidity", t("Available"))}</th>
          <th className={cn(TABLE_HEADER_CELL, "px-4 pr-5 text-right")}>
            <span className="sr-only">{t("Quick actions")}</span>
          </th>
        </tr>
      </thead>

      <tbody key={`loan-${sortKey}-${sortDirection}-${sortedAssets.length}`}>
        {sortedAssets.map((asset, index) => (
          <LoanAssetsRow key={asset.id} asset={asset} index={index} onBorrow={onBorrow} />
        ))}
      </tbody>
    </ScrollableTable>
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
    <tr
      className={`${TABLE_BODY_ROW} group cursor-pointer transition-colors`}
      onClick={() => router.push(borrowAssetDetailPath(asset.id))}
    >
      <td
        className={`py-2.5 pl-5 pr-3 align-middle font-data text-[13px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}
      >
        {index + 1}
      </td>
      <td className={`py-2.5 pl-5 ${TABLE_ROW_HOVER_BG}`}>
        {/* Real anchor on the primary cell: crawlable, copyable, and keyboard-focusable (Enter
            navigates natively). stopPropagation keeps the row's own onClick from double-firing. */}
        <Link
          href={borrowAssetDetailPath(asset.id)}
          onClick={(event) => event.stopPropagation()}
          className="block rounded-radius-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
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
        </Link>
      </td>
      <td className={`py-2.5 pl-4 text-right ${TABLE_ROW_HOVER_BG}`}>
        <span className={cn("font-data text-[13px] font-medium tabular-nums", aprToneClass(asset.borrowApr))}>
          {formatApy(asset.borrowApr)}
        </span>
      </td>
      <td className={`py-2.5 pl-4 ${TABLE_ROW_HOVER_BG}`}>
        <CapacityFilled value={asset.utilization} />
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
              <tr className={TABLE_HEADER_ROW}>
                <th className="pb-2 pt-2.5 pl-5 pr-3 text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  #
                </th>
                <th className="pb-2 pt-2.5 pl-5 text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Asset")}
                </th>
                <th className="pb-2 pt-2.5 pl-4 text-right text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Borrow APR")}
                </th>
                <th className="pb-2 pt-2.5 pl-4 text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <span className="whitespace-nowrap uppercase">{t("Capacity Filled")}</span>
                </th>
                <th className="pb-2 pt-2.5 pl-4 text-right text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Available")}
                </th>
                <th className="pb-2 pt-2.5 pl-4 text-right text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Wallet Balance")}
                </th>
                <th className="w-20 pb-2 pt-2.5 pl-4 text-right text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  7D
                </th>
                <th className="w-44 pb-2 pt-2.5 pl-4 pr-5 text-right text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <span className="sr-only">{t("Quick actions")}</span>
                </th>
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
