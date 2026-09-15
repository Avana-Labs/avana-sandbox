"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { TokenIcon } from "@/app/components/token-icon"
import type { DesktopMenuId } from "@/app/components/header-desktop-menu-data"
import { LEND_ASSET_GROUPS } from "@/app/lib/data/catalog/lend"
import { resolveLendMarketId } from "@/app/lib/lend-system/catalog"
import { categorizeMarket } from "@/app/lib/markets/category"
import { useTranslation } from "@/app/lib/i18n/use-translation"

interface PanelRow {
  symbol: string
  name: string
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
  /** Small uppercase eyebrow — a translated product label. */
  eyebrow: string
  /** One-line intro shown under the eyebrow. */
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
  return `${base}?category=${categorizeMarket(symbol)}`
}

// Prefer a stablecoin / ETH / stocks spread so the panel mirrors the reference (crypto +
// stocks) rather than three near-identical stablecoin columns.
function lendColumns(): PanelColumn[] {
  const preferred = ["Stablecoins", "Ethereum-Based", "Coinbase & Robinhood Stocks"]
  const byTitle = new Map(LEND_ASSET_GROUPS.map((group) => [group.title, group]))
  const chosen = preferred
    .map((title) => byTitle.get(title))
    .filter((group): group is (typeof LEND_ASSET_GROUPS)[number] => Boolean(group))
  for (const group of LEND_ASSET_GROUPS) {
    if (chosen.length >= 3) break
    if (!chosen.includes(group)) chosen.push(group)
  }
  return chosen.slice(0, 3).map((group) => {
    const rows = group.rows.slice(0, 3)
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

function usePanelConfig(menuId: DesktopMenuId): PanelConfig | null {
  const { t } = useTranslation()
  if (menuId === "lend") {
    return {
      eyebrow: t("Lend"),
      tagline: t("Supply capital into Hub-connected lending markets and earn from LP-backed borrower demand."),
      browseHref: "/lend",
      browseLabel: t("Browse Lend Page"),
      metricLabel: t("APY"),
      columns: lendColumns(),
    }
  }
  // Borrow and Multiply panels ship next; their triggers stay plain links until then.
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
                className={`space-y-3 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isOpen ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                }`}
                style={{ transitionDelay: isOpen ? "60ms" : "0ms" }}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {config.eyebrow}
                </p>
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
                    className={`space-y-2.5 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isOpen ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                    }`}
                    style={{ transitionDelay: isOpen ? `${140 + index * 60}ms` : "0ms" }}
                  >
                    <div className="flex items-baseline justify-between pb-1.5">
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
                          key={row.symbol}
                          href={row.href}
                          suppressHydrationWarning
                          className="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
                        >
                          <TokenIcon symbol={row.symbol} size="sm" />
                          <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                            <span className="shrink-0 text-[13px] font-semibold text-foreground">{row.symbol}</span>
                            <span className="truncate text-[12px] text-muted-foreground">{row.name}</span>
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
