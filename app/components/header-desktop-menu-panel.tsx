"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { TokenIcon } from "@/app/components/token-icon"
import type { DesktopMenuId } from "@/app/components/header-desktop-menu-data"
import { LEND_ASSET_GROUPS } from "@/app/lib/data/catalog/lend"
import { resolveLendMarketId } from "@/app/lib/lend-system/catalog"
import { BORROW_POOL_CATALOG, type BorrowPoolRow } from "@/app/lib/data/borrow-domain"
import { formatLtvPct } from "@/app/lib/borrow-sim"
import { borrowMarketDetailPath } from "@/app/lib/borrow-routes"
import { MULTIPLY_MARKET_ROWS } from "@/app/lib/data/catalog/multiply"
import { categorizeMarket, type MarketCategory } from "@/app/lib/markets/category"
import { useTranslation } from "@/app/lib/i18n/use-translation"

interface PanelRow {
  /** Symbol used for the (primary) token icon. */
  symbol: string
  /** Second symbol — renders an overlapping pair (pool / loop markets). */
  symbol2?: string
  /** Bold display label; defaults to `symbol` (loop markets show a collateral/asset pair). */
  label?: string
  name?: string
  metric: string
  /** Per-market detail page. */
  href: string
}

interface PanelColumn {
  title: string
  /** Product page with this column's category chip preselected. */
  viewAllHref: string
  rows: PanelRow[]
}

interface PanelConfig {
  /** One-line intro shown at the top of the rail. */
  tagline: string
  /** The intro CTA target (the product landing page) and its label. */
  browseHref: string
  browseLabel: string
  /** Right-aligned metric label for each column (e.g. APY / APR / Net APY). */
  metricLabel: string
  columns: PanelColumn[]
}

// Deep-link a column's "View all" to the product page with the matching category chip
// preselected (?category=). Stablecoins → forex, ETH family → eth, stocks/curated → smart.
function categoryHref(base: string, symbol: string): string {
  return `${base}?category=${categorizeMarket(symbol)}#markets`
}

// Niche stablecoins pushed below the majors so the Stablecoins column leads with USDC/USDT/GHO.
const LEND_DEMOTE = new Set(["EURC", "frxUSD"])

// Prefer a stablecoin / BTC / stocks spread so the columns span colours rather than reading as
// three near-identical blue columns.
function lendColumns(): PanelColumn[] {
  const preferred = ["Stablecoins", "Bitcoin Based", "Coinbase & Robinhood Stocks"]
  const byTitle = new Map(LEND_ASSET_GROUPS.map((group) => [group.title, group]))
  const chosen = preferred
    .map((title) => byTitle.get(title))
    .filter((group): group is (typeof LEND_ASSET_GROUPS)[number] => Boolean(group))
  for (const group of LEND_ASSET_GROUPS) {
    if (chosen.length >= 3) break
    if (!chosen.includes(group)) chosen.push(group)
  }
  return chosen.slice(0, 3).map((group) => {
    const rows = [...group.rows]
      .sort((a, b) => Number(LEND_DEMOTE.has(a.symbol)) - Number(LEND_DEMOTE.has(b.symbol)))
      .slice(0, 3)
    return {
      title: group.title,
      viewAllHref: categoryHref("/lend", rows[0]?.symbol ?? ""),
      rows: rows.map((row) => ({
        symbol: row.symbol,
        name: row.name,
        metric: row.apy,
        href: `/lend/markets/${resolveLendMarketId(row.symbol)}`,
      })),
    }
  })
}

const CATEGORY_TITLE: Record<MarketCategory, string> = {
  eth: "ETH",
  btc: "BTC",
  forex: "Stablecoins",
  utility: "Utility",
  smart: "Smart",
}

// A pool's signature family for colour spread: its first non-stable leg, else stable.
function poolFamily(pool: BorrowPoolRow): MarketCategory {
  const cats = pool.visuals.map((visual) => categorizeMarket(visual.symbol))
  return cats.find((category) => category !== "forex") ?? "forex"
}

// Greedily pick up to `count` pools that maximise variety: each step takes the unused,
// unique-pair pool that introduces the most new tokens (tie-broken by a new token family), so a
// column doesn't lean on one token (e.g. USDC) in every row.
function pickDiversePools(pools: BorrowPoolRow[], count: number): BorrowPoolRow[] {
  const chosen: BorrowPoolRow[] = []
  const seenPairs = new Set<string>()
  const seenTokens = new Set<string>()
  const seenFamilies = new Set<MarketCategory>()
  const pairKey = (pool: BorrowPoolRow) =>
    [pool.visuals[0].symbol, pool.visuals[1].symbol]
      .map((symbol) => symbol.toUpperCase())
      .sort()
      .join("/")
  while (chosen.length < count) {
    let best: BorrowPoolRow | null = null
    let bestScore = -1
    for (const pool of pools) {
      if (seenPairs.has(pairKey(pool))) continue
      const newTokens = pool.visuals.filter((visual) => !seenTokens.has(visual.symbol.toUpperCase())).length
      const score = newTokens * 2 + (seenFamilies.has(poolFamily(pool)) ? 0 : 1)
      if (score > bestScore) {
        bestScore = score
        best = pool
      }
    }
    if (!best) break
    chosen.push(best)
    seenPairs.add(pairKey(best))
    seenFamilies.add(poolFamily(best))
    for (const visual of best.visuals) seenTokens.add(visual.symbol.toUpperCase())
  }
  return chosen
}

function poolDex(pool: BorrowPoolRow): string {
  const spoke = pool.spoke
  if (spoke.startsWith("uni")) return "Uniswap"
  if (spoke.startsWith("aero")) return "Aerodrome"
  if (spoke.startsWith("curve")) return "Curve"
  if (spoke.startsWith("bal")) return "Balancer"
  return pool.dexes[0]?.label ?? pool.venue
}

// Group collateral (LP) pools by venue (Uniswap / Aerodrome / Curve …); one column per DEX,
// deep-linking "View all" to the borrow page's search pre-filled with that venue.
function borrowColumns(): PanelColumn[] {
  const preferred = ["Uniswap", "Aerodrome", "Curve"]
  const byDex = new Map<string, BorrowPoolRow[]>()
  for (const pool of BORROW_POOL_CATALOG) {
    const dex = poolDex(pool)
    const bucket = byDex.get(dex) ?? []
    bucket.push(pool)
    byDex.set(dex, bucket)
  }
  const dexes = [
    ...preferred.filter((dex) => byDex.has(dex)),
    ...[...byDex.keys()].filter((dex) => !preferred.includes(dex)),
  ].slice(0, 3)
  return dexes.map((dex) => ({
    title: dex,
    viewAllHref: `/borrow?q=${encodeURIComponent(dex)}#markets`,
    rows: pickDiversePools(byDex.get(dex) ?? [], 3).map((pool) => ({
      symbol: pool.visuals[0].symbol,
      symbol2: pool.visuals[1].symbol,
      label: `${pool.visuals[0].symbol}/${pool.visuals[1].symbol}`,
      metric: formatLtvPct(pool.ltv),
      href: borrowMarketDetailPath(pool.id),
    })),
  }))
}

// Group loop markets by their collateral's family; show a few of the populated buckets.
function multiplyColumns(): PanelColumn[] {
  const order: MarketCategory[] = ["eth", "btc", "forex", "utility", "smart"]
  const byCategory = new Map<MarketCategory, Array<(typeof MULTIPLY_MARKET_ROWS)[number]>>()
  for (const row of MULTIPLY_MARKET_ROWS) {
    const category = categorizeMarket(row.protocol)
    const bucket = byCategory.get(category) ?? []
    bucket.push(row)
    byCategory.set(category, bucket)
  }
  return order
    .filter((category) => (byCategory.get(category)?.length ?? 0) > 0)
    .slice(0, 3)
    .map((category) => ({
      title: CATEGORY_TITLE[category],
      viewAllHref: `/multiply?category=${category}#markets`,
      rows: (byCategory.get(category) ?? []).slice(0, 3).map((row) => ({
        symbol: row.protocol,
        symbol2: row.asset,
        label: `${row.protocol}/${row.asset}`,
        metric: row.apy,
        href: row.href,
      })),
    }))
}

function usePanelConfig(menuId: DesktopMenuId): PanelConfig | null {
  const { t } = useTranslation()
  if (menuId === "lend") {
    return {
      tagline: t("Supply capital into Hub-connected lending markets and earn from LP-backed borrower demand."),
      browseHref: "/lend",
      browseLabel: t("Browse Lend Page"),
      metricLabel: t("APY"),
      columns: lendColumns(),
    }
  }
  if (menuId === "borrow") {
    return {
      tagline: t(
        "Turn your liquidity pool positions into collateral and borrow against them here without leaving the pool.",
      ),
      browseHref: "/borrow",
      browseLabel: t("Browse Borrow Page"),
      metricLabel: t("LTV"),
      columns: borrowColumns(),
    }
  }
  if (menuId === "multiply") {
    return {
      tagline: t(
        "Supply collateral, borrow against it, resupply the borrowed capital, and repeat until your risk limit.",
      ),
      browseHref: "/multiply",
      browseLabel: t("Browse Multiply Page"),
      metricLabel: t("Net APY"),
      columns: multiplyColumns(),
    }
  }
  return null
}

interface HeaderDesktopMenuPanelProps {
  menuId: DesktopMenuId
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onExited: () => void
  animationCycle: number
  focusOnOpen: boolean
}

export default function HeaderDesktopMenuPanel({
  menuId,
  isOpen,
  onOpen,
  onClose,
  onExited,
  animationCycle,
  focusOnOpen,
}: HeaderDesktopMenuPanelProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const config = usePanelConfig(menuId)

  useEffect(() => {
    if (isOpen && focusOnOpen) panelRef.current?.querySelector<HTMLElement>("a")?.focus()
  }, [isOpen, focusOnOpen, menuId, animationCycle])

  if (!config) return null

  return (
    <>
      {/* Backdrop blur behind the panel — mirrors the desktop search dialog overlay. */}
      <div
        aria-hidden="true"
        onMouseEnter={onClose}
        className={`fixed inset-x-0 bottom-0 top-14 z-20 hidden bg-black/25 backdrop-blur-sm transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] min-[1440px]:block ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        id={`desktop-menu-${menuId}`}
        ref={panelRef}
        inert={!isOpen}
        aria-hidden={!isOpen}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        onTransitionEnd={(event) => {
          if (!isOpen && event.target === event.currentTarget) onExited()
        }}
        className={`fixed inset-x-0 top-14 z-30 hidden transform-gpu transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] min-[1440px]:block ${
          isOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <div className="border-b border-border bg-background">
          <div className="mx-auto w-full max-w-[1320px] px-6 py-7 2xl:px-8">
            <div
              key={`${menuId}-${animationCycle}`}
              className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
            >
              {/* Intro rail */}
              <div
                className={`space-y-3 pt-9 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isOpen ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                }`}
                style={{ transitionDelay: isOpen ? "60ms" : "0ms" }}
              >
                <p className="max-w-[15rem] text-[15px] font-medium leading-[1.4] tracking-[-0.01em] text-foreground">
                  {config.tagline}
                </p>
                <Link
                  href={config.browseHref}
                  suppressHydrationWarning
                  className="group inline-flex items-center gap-1 text-[13px] font-medium text-brand transition-colors hover:text-foreground"
                >
                  {config.browseLabel}
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </div>

              {/* Market columns */}
              <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {config.columns.map((column, index) => (
                  <div
                    key={column.title}
                    className={`space-y-1.5 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isOpen ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                    }`}
                    style={{ transitionDelay: isOpen ? `${140 + index * 60}ms` : "0ms" }}
                  >
                    <div className="flex items-baseline justify-between pb-0.5">
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        {column.title}
                      </p>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        {config.metricLabel}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {column.rows.map((row) => (
                        <Link
                          key={row.href}
                          href={row.href}
                          suppressHydrationWarning
                          className="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
                        >
                          <span className="flex shrink-0 items-center">
                            <TokenIcon symbol={row.symbol} size="sm" />
                            {row.symbol2 ? <TokenIcon symbol={row.symbol2} size="sm" className="-ml-2" /> : null}
                          </span>
                          <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                            <span className="shrink-0 text-[13px] font-semibold text-foreground">
                              {row.label ?? row.symbol}
                            </span>
                            {row.name ? (
                              <span className="truncate text-[12px] text-muted-foreground">{row.name}</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-[13px] font-medium tabular-nums text-foreground">
                            {row.metric}
                          </span>
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={column.viewAllHref}
                      suppressHydrationWarning
                      className="group inline-flex items-center gap-1 px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t("View all")}
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-200 group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
