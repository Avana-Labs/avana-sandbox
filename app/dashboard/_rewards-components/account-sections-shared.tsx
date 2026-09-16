"use client"

import { Suspense, useMemo, type ReactNode } from "react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { ActionIcon } from "@/app/components/action-icon"
import { ActionTokenPairIcon } from "@/app/components/action-page/action-token-icon"
import { Button } from "@/components/ui/button"
import { TokenIcon } from "@/app/components/token-icon"
import { DesktopTableSurface } from "@/app/components/market-table-primitives"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import {
  MarketMobileActionFooter,
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileIdentityText,
  MarketMobileMetric,
  MARKET_MOBILE_CTA_CLASS,
} from "@/app/components/market-card-primitives"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"
import { formatTokenPrice } from "@/app/lib/prices/format"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { buildDashboardWalletBalanceRows } from "@/app/lib/swap-system"
import { useConvexProductWalletBalances } from "@/app/lib/swap-system/use-convex-wallet-balances"
import type { UserAssetBalance } from "@/app/lib/swap-system"
import type { MultiplyMarketRecord } from "@/app/lib/multiply-engine"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { formatMultiplyLoopMarketLabel } from "@/app/lib/multiply-system/market-labels"
import { resolveMultiplyMarketDisplayMaxLeverage } from "@/app/lib/multiply-system/leverage-limits"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import {
  TABLE_BASE,
  TABLE_BODY_ROW,
  TABLE_CELL_NUMERIC,
  TABLE_CELL_PADDING,
  TABLE_CELL_PADDING_TRAILING,
  TABLE_CELL_PRIMARY,
  TABLE_CELL_SECONDARY,
  TABLE_HEADER_CELL,
  TABLE_HEADER_ROW,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
  formatTableHeaderLabel,
} from "@/app/lib/ui/table-row-hover"
import { cn } from "@/lib/utils"

/** Adaptive token-amount precision so `amount × unit price` reconciles with the USD value. */
function formatAvailableAmount(value: number, symbol: string) {
  const maximumFractionDigits = value >= 100 ? 2 : value >= 1 ? 4 : 6
  return `${value.toLocaleString("en-US", { maximumFractionDigits })} ${symbol}`
}

/** Per-row CTA for an available balance (Deposit on lend, Multiply on multiply, …). */
type AvailableRowAction = {
  /** ActionIcon label, e.g. "deposit" | "multiply". */
  icon: string
  /** Already-translated button text. */
  label: string
  href: (row: { assetId: string; symbol: string }) => string
}

function AvailableActionButton({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <div className="flex justify-end">
      <Button asChild size="table" variant="table-primary" className="w-auto">
        <Link href={href}>
          <ActionIcon label={icon} />
          {label}
        </Link>
      </Button>
    </div>
  )
}

const MASK = "••••"

/**
 * Idle "available to use" funds for a product — the buckets that were moved off the
 * Wallet tab (which now shows only unallocated funds). Rendering them here keeps the
 * money visible on the product it belongs to, and lets the global Net Value reconcile
 * with the per-tab totals. Renders nothing when the wallet has no such balance.
 */
export function ProductAvailableCard({
  walletId,
  sourceTypes,
  allowedAssetIds,
  title,
  action,
}: {
  walletId: string
  sourceTypes: ReadonlyArray<UserAssetBalance["sourceType"]>
  /** Optional product catalog filter for shared wallet rows. */
  allowedAssetIds?: ReadonlySet<string>
  /** Already-translated heading (translate at the call site so i18n parity can see the key). */
  title: string
  /** Optional per-row CTA (e.g. Deposit / Multiply). */
  action?: AvailableRowAction
}) {
  const { t } = useTranslation()
  const { exact } = useCurrency()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const priceFor = useCanonicalPriceFor()
  const balances = useConvexProductWalletBalances(walletId)
  // Do not invoke buildDashboardWalletBalanceRows without an explicit result: its
  // default is a test fixture, and a loading Convex query must never render demo money.
  if (balances === undefined) return null
  const allow = new Set(sourceTypes)
  const matchingRows = buildDashboardWalletBalanceRows({ walletId, balances, priceFor }).filter(
    (row) => allow.has(row.sourceType) && (!allowedAssetIds || allowedAssetIds.has(row.assetId)),
  )
  // Prefer canonical unallocated wallet rows when a legacy product-available row for
  // the same asset still exists. This prevents one balance from appearing twice and
  // prevents stale product buckets from masking the real wallet amount.
  const canonicalAssetIds = new Set(matchingRows.filter((row) => row.sourceType === "wallet").map((row) => row.assetId))
  const rows = matchingRows.filter((row) => row.sourceType === "wallet" || !canonicalAssetIds.has(row.assetId))
  if (rows.length === 0) return null
  const total = rows.reduce((sum, row) => sum + row.valueUsd, 0)
  const m = (value: string) => (showDollarAmounts ? value : MASK)
  const priceLabel = (symbol: string) => {
    const price = priceFor(symbol)
    return price !== undefined ? formatTokenPrice(price) : symbol
  }

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">{title}</h3>
        <span className="font-data text-[15px] tabular-nums text-foreground">{m(exact(total))}</span>
      </div>

      <DesktopTableSurface className="hidden !rounded-none md:block">
        <table className={`w-full min-w-[480px] table-fixed border-separate border-spacing-0 ${TABLE_BASE}`}>
          <colgroup>
            <col className={action ? "w-[42%]" : "w-[56%]"} />
            <col className={action ? "w-[30%]" : "w-[44%]"} />
            {action ? <col className="w-[28%]" /> : null}
          </colgroup>
          <thead>
            <tr className={TABLE_HEADER_ROW}>
              <th className={cn(TABLE_HEADER_CELL, "px-5 text-left")}>{formatTableHeaderLabel(t("Asset"))}</th>
              <th className={cn(TABLE_HEADER_CELL, "px-4 text-right", action ? "" : "pr-5")}>
                {formatTableHeaderLabel(t("Available"))}
              </th>
              {action ? (
                <th className={cn(TABLE_HEADER_CELL, "px-4 pr-5 text-right")} aria-label={action.label} />
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-white/6">
            {rows.map((row) => (
              <tr key={row.id} className={`${TABLE_BODY_ROW} group`}>
                <td className={cn(TABLE_CELL_PADDING, "pl-5", TABLE_ROW_HOVER_LEFT)}>
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenIcon symbol={row.symbol} size="table" />
                    <div className="min-w-0">
                      <div className={cn("truncate", TABLE_CELL_PRIMARY)}>{row.name}</div>
                      <div className={cn(TABLE_CELL_SECONDARY, "tabular-nums")}>{priceLabel(row.symbol)}</div>
                    </div>
                  </div>
                </td>
                <td
                  className={cn(
                    "text-right",
                    action
                      ? cn(TABLE_CELL_PADDING, TABLE_ROW_HOVER_BG)
                      : cn(TABLE_CELL_PADDING_TRAILING, TABLE_ROW_HOVER_RIGHT),
                  )}
                >
                  <div className={TABLE_CELL_NUMERIC}>{m(formatAvailableAmount(row.amount, row.symbol))}</div>
                  <div className={TABLE_CELL_SECONDARY}>{m(exact(row.valueUsd))}</div>
                </td>
                {action ? (
                  <td className={cn(TABLE_CELL_PADDING_TRAILING, "text-right", TABLE_ROW_HOVER_RIGHT)}>
                    <AvailableActionButton href={action.href(row)} label={action.label} icon={action.icon} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </DesktopTableSurface>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <MarketMobileCard key={row.id} className="space-y-2">
            <MarketMobileCardHeader
              identity={
                <div className="flex min-w-0 items-center gap-2.5">
                  <TokenIcon symbol={row.symbol} size="table" />
                  <MarketMobileIdentityText title={row.name} subtitle={priceLabel(row.symbol)} />
                </div>
              }
              metric={
                <MarketMobileMetric
                  value={m(formatAvailableAmount(row.amount, row.symbol))}
                  label={m(exact(row.valueUsd))}
                />
              }
            />
            {action ? (
              <MarketMobileActionFooter>
                <Button asChild variant="brand" className={MARKET_MOBILE_CTA_CLASS}>
                  <Link href={action.href(row)}>
                    <ActionIcon label={action.icon} />
                    {action.label}
                  </Link>
                </Button>
                <Button asChild variant="brand-secondary" className={MARKET_MOBILE_CTA_CLASS}>
                  <Link href={`/swap?to=${encodeURIComponent(row.assetId)}`}>
                    <ActionIcon label="swap" />
                    {t("Buy")}
                  </Link>
                </Button>
              </MarketMobileActionFooter>
            ) : (
              <MarketMobileActionFooter>
                <Button asChild variant="brand" className={MARKET_MOBILE_CTA_CLASS}>
                  <Link href={`/swap?from=${encodeURIComponent(row.assetId)}`}>
                    <ActionIcon label="swap" />
                    {t("Swap")}
                  </Link>
                </Button>
                <Button asChild variant="brand-secondary" className={MARKET_MOBILE_CTA_CLASS}>
                  <Link href={`/swap?to=${encodeURIComponent(row.assetId)}`}>
                    <ActionIcon label="swap" />
                    {t("Buy")}
                  </Link>
                </Button>
              </MarketMobileActionFooter>
            )}
          </MarketMobileCard>
        ))}
      </div>
    </section>
  )
}

export type MultiplyAvailableMarketRow = {
  market: MultiplyMarketRecord
  amount: number
  valueUsd: number
}

/**
 * Maps explicit Convex Multiply-available buckets to actual catalog markets.
 * This keeps the dashboard's Multiply tab market-scoped: a WSTETH balance is
 * shown as the WSTETH/ETH loop it can open, never as an orphan token row.
 */
export function buildMultiplyAvailableMarketRows({
  balances,
  markets,
  priceFor,
}: {
  balances: readonly UserAssetBalance[]
  markets: Readonly<Record<string, MultiplyMarketRecord>>
  priceFor?: (symbol: string) => number | undefined
}): MultiplyAvailableMarketRow[] {
  const marketList = Object.values(markets).sort((left, right) => left.rank - right.rank)
  const byId = new Map(marketList.map((market) => [market.id.toLowerCase(), market]))
  const grouped = new Map<string, MultiplyAvailableMarketRow>()

  for (const balance of balances) {
    if (balance.sourceType !== "multiply_available") continue
    const explicitMarket = balance.sourcePositionId ? byId.get(balance.sourcePositionId.toLowerCase()) : undefined
    const market =
      explicitMarket ??
      marketList.find(
        (candidate) => candidate.collateralAsset.symbol.toLowerCase() === balance.assetId.trim().toLowerCase(),
      )
    if (!market) continue

    const livePrice = priceFor?.(market.collateralAsset.symbol)
    const priceUsd =
      livePrice !== undefined && Number.isFinite(livePrice) && livePrice > 0
        ? livePrice
        : market.collateralAsset.priceUsd
    const storedValueUsd = balance.valueUsd
    const hasStoredValue = typeof storedValueUsd === "number" && Number.isFinite(storedValueUsd) && storedValueUsd > 0
    const valueUsd = hasStoredValue ? storedValueUsd : Math.max(0, balance.amount * priceUsd)
    const amount = priceUsd > 0 ? valueUsd / priceUsd : balance.amount
    if (!(valueUsd > 0)) continue

    const existing = grouped.get(market.id)
    grouped.set(market.id, {
      market,
      amount: (existing?.amount ?? 0) + amount,
      valueUsd: (existing?.valueUsd ?? 0) + valueUsd,
    })
  }

  return [...grouped.values()].sort((left, right) => left.market.rank - right.market.rank)
}

/** Market-scoped version of ProductAvailableCard for the Multiply dashboard tab. */
export function MultiplyAvailableMarketsCard({
  walletId,
  markets,
  title,
}: {
  walletId: string
  markets: Readonly<Record<string, MultiplyMarketRecord>>
  title: string
}) {
  const { t } = useTranslation()
  const { exact } = useCurrency()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const priceFor = useCanonicalPriceFor()
  const balances = useConvexProductWalletBalances(walletId)
  const rows = useMemo(
    () => (balances ? buildMultiplyAvailableMarketRows({ balances, markets, priceFor }) : []),
    [balances, markets, priceFor],
  )

  if (balances === undefined || rows.length === 0) return null

  const total = rows.reduce((sum, row) => sum + row.valueUsd, 0)
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">{title}</h3>
        <span className="font-data text-[15px] tabular-nums text-foreground">{m(exact(total))}</span>
      </div>

      <DesktopTableSurface className="hidden !rounded-none md:block">
        <table className={`w-full min-w-[620px] table-fixed border-separate border-spacing-0 ${TABLE_BASE}`}>
          <colgroup>
            <col className="w-[46%]" />
            <col className="w-[30%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead>
            <tr className={TABLE_HEADER_ROW}>
              <th className={cn(TABLE_HEADER_CELL, "px-5 text-left")}>{formatTableHeaderLabel(t("Market"))}</th>
              <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{formatTableHeaderLabel(t("Available"))}</th>
              <th className={cn(TABLE_HEADER_CELL, "px-4 pr-5 text-right")} aria-label={t("Multiply")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-white/6">
            {rows.map((row) => (
              <tr key={row.market.id} className={`${TABLE_BODY_ROW} group`}>
                <td className={cn(TABLE_CELL_PADDING, "pl-5", TABLE_ROW_HOVER_LEFT)}>
                  <Link href={`/multiply/markets/${row.market.id}`} className="flex min-w-0 items-center gap-3">
                    <ActionTokenPairIcon
                      collateralSymbol={row.market.collateralAsset.symbol}
                      borrowSymbol={row.market.borrowAsset.symbol}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className={cn("truncate", TABLE_CELL_PRIMARY)}>
                        {formatMultiplyLoopMarketLabel(
                          row.market.collateralAsset.symbol,
                          row.market.borrowAsset.symbol,
                        )}
                      </div>
                      <div className={cn(TABLE_CELL_SECONDARY, "tabular-nums")}>
                        Max APY {(row.market.economics.estimatedMaxApy * 100).toFixed(2)}% · Max{" "}
                        {resolveMultiplyMarketDisplayMaxLeverage(row.market.risk.publicMaxMultiplier).toFixed(2)}x
                      </div>
                    </div>
                  </Link>
                </td>
                <td className={cn(TABLE_CELL_PADDING, "text-right", TABLE_ROW_HOVER_BG)}>
                  <div className={TABLE_CELL_NUMERIC}>
                    {m(formatAvailableAmount(row.amount, row.market.collateralAsset.symbol))}
                  </div>
                  <div className={TABLE_CELL_SECONDARY}>{m(exact(row.valueUsd))}</div>
                </td>
                <td className={cn(TABLE_CELL_PADDING_TRAILING, "text-right", TABLE_ROW_HOVER_RIGHT)}>
                  <AvailableActionButton
                    href={actionPagePath("multiply", "multiply", { market: row.market.id })}
                    label={t("Multiply")}
                    icon="multiply"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DesktopTableSurface>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <MarketMobileCard key={row.market.id} className="space-y-2">
            <MarketMobileCardHeader
              identity={
                <Link href={`/multiply/markets/${row.market.id}`} className="flex min-w-0 items-center gap-2.5">
                  <ActionTokenPairIcon
                    collateralSymbol={row.market.collateralAsset.symbol}
                    borrowSymbol={row.market.borrowAsset.symbol}
                    size="sm"
                  />
                  <MarketMobileIdentityText
                    title={formatMultiplyLoopMarketLabel(
                      row.market.collateralAsset.symbol,
                      row.market.borrowAsset.symbol,
                    )}
                    subtitle={`Max APY ${(row.market.economics.estimatedMaxApy * 100).toFixed(2)}%`}
                  />
                </Link>
              }
              metric={
                <MarketMobileMetric
                  value={m(formatAvailableAmount(row.amount, row.market.collateralAsset.symbol))}
                  label={m(exact(row.valueUsd))}
                />
              }
            />
            <MarketMobileActionFooter>
              <Button asChild variant="brand" className={MARKET_MOBILE_CTA_CLASS}>
                <Link href={actionPagePath("multiply", "multiply", { market: row.market.id })}>
                  <ActionIcon label="multiply" />
                  {t("Multiply")}
                </Link>
              </Button>
            </MarketMobileActionFooter>
          </MarketMobileCard>
        ))}
      </div>
    </section>
  )
}

/**
 * Underline sub-tab strip for the account sections (Borrow/Multiply) on the
 * portfolio page — same treatment as the old dashboard SectionTabStrip.
 */
export function SectionTabStrip<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}) {
  const { t } = useTranslation()
  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" aria-label={ariaLabel} className="flex w-max min-w-max gap-8">
        {items.map((tab) => {
          const active = tab.id === value
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              data-state={active ? "active" : "inactive"}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 pb-2 text-left text-[15px] font-normal tracking-normal transition-colors md:text-[18px]",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(tab.label)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const ACCOUNT_MODULE_FALLBACK_HEIGHT = {
  borrow: "h-[520px]",
  multiply: "h-[560px]",
} as const

export function AccountModuleBoundary({
  children,
  product,
}: {
  children: ReactNode
  product: keyof typeof ACCOUNT_MODULE_FALLBACK_HEIGHT
}) {
  return (
    <Suspense
      fallback={
        <Skeleton
          className={cn("w-full rounded-radius-md", ACCOUNT_MODULE_FALLBACK_HEIGHT[product])}
          data-testid={`${product}-account-module-skeleton`}
        />
      }
    >
      {children}
    </Suspense>
  )
}
