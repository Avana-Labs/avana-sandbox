"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { Button } from "@/components/ui/button"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobilePrimaryAction,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import { LEND_ASSET_GROUPS } from "@/app/lib/data/catalog/lend"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { cn } from "@/lib/utils"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"
import { usePriceFor } from "@/app/lib/prices/token-prices-context"
import { formatTokenPrice } from "@/app/lib/prices/format"
import { useTranslation } from "@/app/lib/i18n/use-translation"

/** Real DefiLlama price under the asset name; falls back to the symbol when unpriced. */
function AssetSubLabel({ symbol }: { symbol: string }) {
  const priceFor = usePriceFor()
  const price = priceFor(symbol)
  return <>{price !== undefined ? formatTokenPrice(price) : symbol}</>
}

type AssetRow = LendPageData["assetGroups"][number]["rows"][number] & {
  marketId?: string
  href?: string
  supplyApyLabel?: string
  rewardsApyLabel?: string
  totalApyLabel?: string
  supplyApyValue?: number
  rewardsApyValue?: number
  totalDepositsLabel?: string
  totalDepositsSecondaryLabel?: string
  totalDepositsSortValue?: number
  utilizationLabel?: string
  utilizationValue?: number
  availableLiquidityLabel?: string
  availableLiquiditySecondaryLabel?: string
  availableLiquiditySortValue?: number
}
type AssetGroup = LendPageData["assetGroups"][number]
const DEFAULT_ASSET_GROUPS: AssetGroup[] = LEND_ASSET_GROUPS
const STABLE_SYMBOLS = new Set(DEFAULT_ASSET_GROUPS[0]?.rows.map((row) => row.symbol) ?? [])
const ALL_HUBS_LABEL = "All Hubs"
const ALL_MARKETS_LABEL = "All Markets"
const HUB_OPTIONS = ["Stable", "Volatile"]
const MARKET_OPTIONS = DEFAULT_ASSET_GROUPS.map((group) => group.title)

function getHubBucket(row: AssetRow) {
  return STABLE_SYMBOLS.has(row.symbol) ? "Stable" : "Volatile"
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6 text-brand">
      <path d="m21 21-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    </svg>
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

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 14" fill="none" className="size-3.5 text-current">
      <path d="M3 4.5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 9.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FilterCheckIcon({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
        checked
          ? "border-brand bg-brand text-white"
          : "border-black/35 bg-transparent text-transparent dark:border-white/55",
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className="size-3">
        <path d="M2.5 6.2 4.8 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function MultiSelectDropdown({
  allLabel,
  countLabel,
  options,
  selectedValues,
  onChange,
  ariaLabel,
}: {
  allLabel: string
  countLabel: string
  options: string[]
  selectedValues: string[]
  onChange: (nextValues: string[]) => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [panelStyle, setPanelStyle] = useState<{
    left: number
    top: number
    width: number
    maxHeight: number
  } | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const isAllSelected = selectedValues.length === 0 || selectedValues.length === options.length
  const triggerLabel = isAllSelected ? allLabel : `${countLabel} (${selectedValues.length})`

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    return () => document.removeEventListener("pointerdown", handlePointerDown, true)
  }, [open])

  useEffect(() => {
    if (!open) return

    const updatePanelPosition = () => {
      if (!rootRef.current || !panelRef.current) return

      const triggerRect = rootRef.current.getBoundingClientRect()
      const panelHeight = panelRef.current.offsetHeight
      const spaceBelow = window.innerHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top
      const nextOpenUpward = spaceBelow < panelHeight + 12 && spaceAbove > spaceBelow
      const width = Math.min(216, window.innerWidth - 16)
      const left = Math.max(8, triggerRect.right - width)
      const maxHeight = Math.max(140, Math.min(220, (nextOpenUpward ? spaceAbove : spaceBelow) - 12))
      const top = nextOpenUpward
        ? Math.max(8, triggerRect.top - Math.min(panelHeight, maxHeight) - 8)
        : Math.min(window.innerHeight - Math.min(panelHeight, maxHeight) - 8, triggerRect.bottom + 8)

      setOpenUpward(nextOpenUpward)
      setPanelStyle({ left, top, width, maxHeight })
    }

    updatePanelPosition()

    const updateAnchoredPosition = () => {
      if (!rootRef.current || !panelRef.current) return

      const triggerRect = rootRef.current.getBoundingClientRect()
      const panelHeight = panelRef.current.offsetHeight
      const width = Math.min(216, window.innerWidth - 16)
      const left = Math.max(8, triggerRect.right - width)
      const availableSpace = openUpward ? triggerRect.top : window.innerHeight - triggerRect.bottom
      const maxHeight = Math.max(140, Math.min(220, availableSpace - 12))
      const top = openUpward
        ? Math.max(8, triggerRect.top - Math.min(panelHeight, maxHeight) - 8)
        : Math.min(window.innerHeight - Math.min(panelHeight, maxHeight) - 8, triggerRect.bottom + 8)

      setPanelStyle({ left, top, width, maxHeight })
    }

    window.addEventListener("resize", updateAnchoredPosition)
    window.addEventListener("scroll", updateAnchoredPosition, true)

    return () => {
      window.removeEventListener("resize", updateAnchoredPosition)
      window.removeEventListener("scroll", updateAnchoredPosition, true)
    }
  }, [open, openUpward, options.length])

  const toggleOption = (option: string, checked: boolean) => {
    if (!checked) {
      const nextValues = selectedValues.filter((value) => value !== option)
      onChange(nextValues)
      return
    }

    onChange(Array.from(new Set([...selectedValues, option])))
  }

  return (
    <div ref={rootRef} className="relative z-20">
      <button
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium tracking-[-0.03em] shadow-elev-1 outline-none transition-colors focus-visible:ring-2 md:h-10 md:px-4 md:text-[14px]",
          "border border-border bg-card text-foreground hover:bg-neutral-50 focus-visible:ring-black/10 dark:border-white/8 dark:text-white dark:hover:bg-[#262626] dark:focus-visible:ring-white/10",
        )}
      >
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <span className="text-foreground/70 dark:text-white/80">
          <ChevronDownIcon />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={`Close ${ariaLabel}`}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />

          <div
            ref={panelRef}
            className={cn(
              "fixed z-30 overflow-hidden rounded-radius-lg border shadow-[0_22px_44px_rgba(0,0,0,0.24)]",
              "border-border bg-popover text-foreground dark:border-white/8 dark:bg-surface-inset dark:text-white",
            )}
            style={
              panelStyle
                ? {
                    left: panelStyle.left,
                    top: panelStyle.top,
                    width: panelStyle.width,
                    maxHeight: panelStyle.maxHeight,
                  }
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => {
                onChange([])
                setOpen(false)
              }}
              className={cn(
                "flex h-10 w-full items-center gap-3 px-3.5 text-left text-[13px] font-medium tracking-[-0.03em] transition-colors md:h-11 md:px-4 md:text-[14px]",
                "text-foreground hover:bg-black/[0.04] dark:text-white dark:hover:bg-card/5",
              )}
            >
              <FilterCheckIcon checked={isAllSelected} />
              <span>{allLabel}</span>
            </button>

            <div
              className={cn(
                "w-full border-t",
                "border-black/12 dark:border-white/20",
              )}
            />

            <div className="overflow-y-auto py-1 pb-3" style={panelStyle ? { maxHeight: panelStyle.maxHeight - 41 } : undefined}>
              {options.map((option) => {
                const checked = selectedValues.includes(option)

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option, !checked)}
                    className={cn(
                      "flex h-9 w-full items-center gap-3 px-3.5 text-left text-[13px] tracking-[-0.03em] transition-colors",
                      checked
                        ? "bg-black/[0.05] font-medium text-foreground dark:bg-card/6 dark:text-white"
                        : "text-foreground/82 hover:bg-black/[0.04] dark:text-white/82 dark:hover:bg-card/5",
                    )}
                  >
                    <FilterCheckIcon checked={checked} />
                    <span className="truncate">{option}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function AssetIcon({ row }: { row: AssetRow }) {
  if (row.logoSrc) {
    return (
      <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-transparent">
        <Image
          alt={row.logoAlt ?? `${row.symbol} logo`}
          src={row.logoSrc}
          width={40}
          height={40}
          className="h-full w-full object-contain"
          unoptimized
        />
      </span>
    )
  }

  return <TokenIcon symbol={row.symbol} size="table" ring className="bg-card dark:bg-card" />
}

function AssetRowView({
  row,
  delay,
  onDeposit,
}: {
  row: AssetRow
  delay: number
  onDeposit?: (marketId: string) => void
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const marketId = "marketId" in row && typeof row.marketId === "string" ? row.marketId : row.symbol.toLowerCase()
  const detailHref = row.href ?? `/lend/markets/${marketId}`
  const detailReturn = detailHref
  return (
    <tr
      className="asset-swap group cursor-pointer transition-colors"
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => router.push(detailHref)}
    >
      <td className={`py-3 pl-6 pr-4 ${TABLE_ROW_HOVER_LEFT}`}>
        <div className="flex min-w-0 items-center gap-3">
          <AssetIcon row={row} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88 md:text-[14px]">
              {row.name}
            </div>
            <div className="mt-0.5 text-[12px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38 md:text-[12px]">
              <AssetSubLabel symbol={row.symbol} />
            </div>
          </div>
        </div>
      </td>

      <td className={`py-3 px-4 text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[14px] ${TABLE_ROW_HOVER_BG}`}>
        <span className="tabular-nums">{row.supplyApyLabel ?? row.apy}</span>
      </td>

      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[14px]">
          <span className="tabular-nums">{row.totalDepositsLabel ?? row.totalDepositsPrimary}</span>
        </div>
        <div className="mt-0.5 text-[12px] tracking-[-0.03em] text-muted-foreground dark:text-white/38">
          {row.totalDepositsSecondaryLabel ?? row.totalDepositsSecondary}
        </div>
      </td>

      <td className={`py-3 px-4 text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[14px] ${TABLE_ROW_HOVER_BG}`}>
        <span className="tabular-nums">{row.utilizationLabel ?? "—"}</span>
      </td>

      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[14px]">
          <span className="tabular-nums">{row.availableLiquidityLabel ?? row.availableLiquidityPrimary}</span>
        </div>
        <div className="mt-0.5 text-[12px] tracking-[-0.03em] text-muted-foreground dark:text-white/38">
          {row.availableLiquiditySecondaryLabel ?? row.availableLiquiditySecondary}
        </div>
      </td>

      <td className={`py-3 px-4 pr-4 ${TABLE_ROW_HOVER_RIGHT}`}>
        {onDeposit ? (
          <div className="flex justify-end">
            <HoverActionGroup>
              <Button
                type="button"
                size="sm"
                variant="brand"
                className="h-7 rounded-xs px-2.5 text-[11px]"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeposit(marketId)
                }}
              >
                {t("Deposit")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="brand-secondary"
                className="h-7 rounded-xs px-2.5 text-[11px]"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(actionPagePath("lend", "withdraw", { market: marketId, return: detailReturn }))
                }}
              >
                {t("Withdraw")}
              </Button>
            </HoverActionGroup>
          </div>
        ) : null}
      </td>
    </tr>
  )
}

function AssetCardView({
  row,
  index,
  onDeposit,
}: {
  row: AssetRow
  index: number
  onDeposit?: (marketId: string) => void
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const marketId = "marketId" in row && typeof row.marketId === "string" ? row.marketId : row.symbol.toLowerCase()
  const detailHref = row.href ?? `/lend/markets/${marketId}`
  return (
    <MarketMobileCard clickable style={{ animationDelay: `${index * 40}ms` }} onClick={() => router.push(detailHref)}>
      <MarketMobileCardHeader
        identity={
          <div className="flex min-w-0 items-center gap-3">
            <AssetIcon row={row} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">{row.name}</div>
              <div className="mt-0.5 text-[12px] tracking-[-0.03em] text-muted-foreground dark:text-white/40">
                <AssetSubLabel symbol={row.symbol} />
              </div>
            </div>
          </div>
        }
        metric={<MarketMobileMetric value={row.supplyApyLabel ?? row.apy} label={t("APY")} />}
      />
      <MarketMobileStatList className="mt-4">
        <MarketMobileStatRow
          label={t("Total Deposits")}
          value={
            <span>
              {row.totalDepositsLabel ?? row.totalDepositsPrimary}
              <span className="ml-2 text-[12px] tracking-[-0.03em] text-muted-foreground dark:text-white/40">
                {row.totalDepositsSecondaryLabel ?? row.totalDepositsSecondary}
              </span>
            </span>
          }
        />
        <MarketMobileStatRow label={t("Utilization")} value={row.utilizationLabel ?? "—"} />
        <MarketMobileStatRow
          label={t("Available Liquidity")}
          value={
            <span>
              {row.availableLiquidityLabel ?? row.availableLiquidityPrimary}
              <span className="ml-2 text-[12px] tracking-[-0.03em] text-muted-foreground dark:text-white/40">
                {row.availableLiquiditySecondaryLabel ?? row.availableLiquiditySecondary}
              </span>
            </span>
          }
        />
      </MarketMobileStatList>
      {onDeposit ? (
        <MarketMobilePrimaryAction
          onClick={(e) => {
            e.stopPropagation()
            onDeposit(marketId)
          }}
        >
          {t("Deposit")}
        </MarketMobilePrimaryAction>
      ) : null}
    </MarketMobileCard>
  )
}

function AssetSection({
  title,
  subtitle,
  rows,
  onDeposit,
}: {
  title: string
  subtitle?: string
  rows: AssetRow[]
  onDeposit?: (marketId: string) => void
}) {
  const { t } = useTranslation()
  const [sortKey, setSortKey] = useState<"asset" | "supplyApy" | "totalDeposits" | "utilization" | "availableLiquidity">("asset")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const toggleSort = (nextKey: typeof sortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === "asset" ? "asc" : "desc")
  }

  const sortedRows = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1

    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case "supplyApy":
          return ((a.supplyApyValue ?? a.apyValue / 100) - (b.supplyApyValue ?? b.apyValue / 100)) * direction
        case "totalDeposits":
          return ((a.totalDepositsSortValue ?? a.totalDepositsValue ?? 0) - (b.totalDepositsSortValue ?? b.totalDepositsValue ?? 0)) * direction
        case "utilization":
          return ((a.utilizationValue ?? 0) - (b.utilizationValue ?? 0)) * direction
        case "availableLiquidity":
          return (
            (a.availableLiquiditySortValue ?? a.availableLiquidityValue ?? 0) -
            (b.availableLiquiditySortValue ?? b.availableLiquidityValue ?? 0)
          ) * direction
        case "asset":
        default:
          return a.name.localeCompare(b.name) * direction
      }
    })
  }, [rows, sortDirection, sortKey])

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            className={cn(
              "text-[22px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[24px]",
              title === "Ethereum-Based" ? "md:text-[23px]" : "",
            )}
          >
            {t(title)}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[13px] text-muted-foreground dark:text-white/44">{t(subtitle)}</p>
          ) : null}
        </div>
      </div>

      <DesktopTableSurface className="rounded-radius-md">
        <div className="space-y-2 md:hidden">
          {sortedRows.length > 0 ? (
            sortedRows.map((row, index) => (
              <AssetCardView key={row.symbol} row={row} index={index} onDeposit={onDeposit} />
            ))
          ) : (
            <div className="rounded-radius-lg border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
              {t("No assets match these filters.")}
            </div>
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1080px] table-fixed border-separate border-spacing-0 text-[12px]">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[12%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
              <col className="w-[20%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                <th className="rounded-l-radius-lg bg-table-header px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort("asset")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "asset"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>{t("ASSET")}</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("supplyApy")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "supplyApy"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>{t("SUPPLY APY")}</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("totalDeposits")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "totalDeposits"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>{t("TOTAL DEPOSITS")}</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("utilization")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "utilization"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>{t("UTILIZATION")}</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("availableLiquidity")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "availableLiquidity"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>{t("AVAILABLE LIQUIDITY")}</span>
                    <SortIcon />
                  </button>
                </th>
                <SilentActionHeader />
              </tr>
            </thead>
            <tbody key={`${title}-${sortKey}-${sortDirection}`} className="divide-y divide-border dark:divide-white/6">
              {sortedRows.length > 0 ? (
                sortedRows.map((row, index) => (
                  <AssetRowView key={row.symbol} row={row} delay={index * 40} onDeposit={onDeposit} />
                ))
              ) : (
                <tr>
                  <td className="px-6 py-10 text-[12px] text-muted-foreground dark:text-white/60" colSpan={6}>
                    {t("No assets match these filters.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DesktopTableSurface>
    </section>
  )
}

export function LendAssetSpokes({
  groups = DEFAULT_ASSET_GROUPS,
  onDeposit,
}: {
  groups?: LendPageData["assetGroups"]
  onDeposit?: (marketId: string) => void
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [selectedHubs, setSelectedHubs] = useState<string[]>([])
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()

    return groups.map((group) => {
      const matchesMarketGroup = selectedMarkets.length === 0 || selectedMarkets.includes(group.title)
      const rows = group.rows.filter((row) => {
        const matchesSearch =
          query.length === 0 ||
          row.name.toLowerCase().includes(query) ||
          row.symbol.toLowerCase().includes(query)
        const matchesHub = selectedHubs.length === 0 || selectedHubs.includes(getHubBucket(row))
        const matchesMarket = matchesMarketGroup
        return matchesSearch && matchesHub && matchesMarket
      })

      return { ...group, rows }
    }).filter((group) => group.rows.length > 0)
  }, [groups, search, selectedHubs, selectedMarkets])

  return (
    <section className="mt-16 space-y-8" style={{ overflowAnchor: "none" }}>
      <div className="hidden items-center gap-2 py-2.5 md:flex">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 text-foreground shadow-elev-1 transition-colors focus-within:border-foreground/20 dark:border-border/60 dark:text-[#e6f8fb] dark:focus-within:border-brand/30 md:flex-none md:w-[280px]">
          <SearchIcon />
          <input
            aria-label={t("Filter assets")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Search assets")}
            className="lend-filter-input w-full bg-transparent text-[13px] font-normal tracking-[-0.03em] outline-none placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/45 md:text-[15px] md:font-normal"
          />
        </label>

        <div className="ml-auto flex min-w-0 flex-nowrap gap-2">
          <MultiSelectDropdown
            allLabel={ALL_HUBS_LABEL}
            countLabel={t("Hubs")}
            options={HUB_OPTIONS}
            selectedValues={selectedHubs}
            onChange={setSelectedHubs}
            ariaLabel={t("Filter hubs")}
          />

          <MultiSelectDropdown
            allLabel={ALL_MARKETS_LABEL}
            countLabel={t("Markets")}
            options={MARKET_OPTIONS}
            selectedValues={selectedMarkets}
            onChange={setSelectedMarkets}
            ariaLabel={t("Filter markets")}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-2.5 md:hidden">
        <label className="flex h-10 min-w-[11rem] flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 text-foreground shadow-elev-1 transition-colors focus-within:border-foreground/20 dark:border-border/60 dark:text-[#e6f8fb] dark:focus-within:border-brand/30">
          <SearchIcon />
          <input
            aria-label={t("Filter assets")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Search assets")}
            className="w-full min-w-0 bg-transparent text-[13px] font-normal tracking-[-0.03em] outline-none placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/45"
          />
        </label>

        <div className="flex shrink-0 items-center gap-2">
          <MultiSelectDropdown
            allLabel={ALL_HUBS_LABEL}
            countLabel={t("Hubs")}
            options={HUB_OPTIONS}
            selectedValues={selectedHubs}
            onChange={setSelectedHubs}
            ariaLabel={t("Filter hubs")}
          />

          <MultiSelectDropdown
            allLabel={ALL_MARKETS_LABEL}
            countLabel={t("Markets")}
            options={MARKET_OPTIONS}
            selectedValues={selectedMarkets}
            onChange={setSelectedMarkets}
            ariaLabel={t("Filter markets")}
          />
        </div>
      </div>

      <div className="space-y-14">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <div key={group.title} className="space-y-8">
              <AssetSection
                title={group.title}
                subtitle={group.subtitle}
                rows={group.rows}
                onDeposit={onDeposit}
              />
              {group.title === "Ethereum-Based" ? (
                <div className="flex justify-center">
                  <div className="h-px w-full max-w-[980px] bg-gradient-to-r from-transparent via-border/80 to-transparent dark:via-white/10" />
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-radius-md border-0 bg-card px-6 py-10 text-[13px] text-muted-foreground shadow-none">
            {t("No assets match these filters.")}
          </div>
        )}
      </div>
    </section>
  )
}
