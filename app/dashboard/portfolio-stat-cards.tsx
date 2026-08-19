"use client"

/**
 * "Your Dashboard" summary section: a title with an eye (numbers) toggle over
 * three stat cards — Wallet Balance (live from Convex), Net Value, and Net
 * APY. Cards live in a snap-scroll carousel: on desktop the row fits (arrows
 * hide themselves), on mobile the row overflows and arrows appear — same
 * pattern as UmbrellaCooldown.
 */

import { useMemo, useState, type PointerEvent } from "react"
import { cn } from "@/lib/utils"
import { CarouselArrowButtons, useOverflowCarousel } from "@/app/components/carousel-arrow-buttons"
import { Eye, EyeOff } from "@/app/components/icons"
import { HIGHLIGHT_CARD_CLASS } from "@/app/components/highlight-carousel"
import { LEND_FEATURED_ASSETS } from "@/app/lib/data/catalog/lend/featured-assets"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useAvanaIdentity } from "@/app/lib/avana-session/avana-sessions-provider"
import { buildDashboardWalletBalanceRows } from "@/app/lib/swap-system"
import { useConvexProductWalletBalances } from "@/app/lib/swap-system/use-convex-wallet-balances"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { HIDDEN_WALLET_SOURCE_TYPES, sumWalletValueUsd } from "./dashboard-wallet-tab"

const MASK = "••••"

const GRAPH_WIDTH = 396
const GRAPH_HEIGHT = 72
const GRAPH_PADDING_Y = 8
const TONE_UP = "#58d89a"
const TONE_DOWN = "#f0444c"

const FEATURED_PATHS = [LEND_FEATURED_ASSETS.usdt.path, LEND_FEATURED_ASSETS.usdc.path, LEND_FEATURED_ASSETS.gho.path]

const TIME_LABELS = [
  "12:00 AM",
  "1:00 AM",
  "2:00 AM",
  "3:00 AM",
  "4:00 AM",
  "5:00 AM",
  "6:00 AM",
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
]

type ValueFormat = "usd" | "usdCents" | "percent"

type StatCard = {
  key: string
  label: string
  value: string
  format: ValueFormat
  base: number
  amplitude: number
  maskable: boolean
  isPositive: boolean
  deltaPct?: number
}

function parsePathPoints(path: string) {
  return Array.from(path.matchAll(/[ML]([\d.]+),([\d.]+)/g), (m) => ({ x: Number(m[1]), y: Number(m[2]) }))
}

function formatValue(value: number, format: ValueFormat): string {
  switch (format) {
    case "usd":
      return `$${Math.round(value).toLocaleString()}`
    case "usdCents":
      return `$${value.toFixed(2)}`
    case "percent":
      return `${value.toFixed(2)}%`
  }
}

/** Live Wallet Balance from Convex — mirrors the wallet-tab computation exactly. */
function useWalletBalanceCard(): StatCard {
  const { walletId } = useAvanaIdentity()
  const convexBalances = useConvexProductWalletBalances(walletId)
  const rows = buildDashboardWalletBalanceRows({ walletId, balances: convexBalances ?? undefined }).filter(
    (row) => !HIDDEN_WALLET_SOURCE_TYPES.has(row.sourceType),
  )
  const total = sumWalletValueUsd(rows)
  return {
    key: "wallet-balance",
    label: "Wallet Balance",
    value: formatValue(total, "usd"),
    format: "usd",
    base: total > 0 ? total : 1,
    amplitude: 0.03,
    maskable: true,
    isPositive: true,
  }
}

// Mock values for the two summary cards — UI-only until portfolio wiring lands.
const NET_VALUE_CARD: StatCard = {
  key: "net-value",
  label: "Net Value",
  value: "$549.94",
  format: "usdCents",
  base: 549.94,
  amplitude: 0.05,
  maskable: true,
  isPositive: true,
  deltaPct: 2.5,
}

const NET_APY_CARD: StatCard = {
  key: "net-apy",
  label: "Net APY",
  value: "14.20%",
  format: "percent",
  base: 14.2,
  amplitude: 0.06,
  maskable: false,
  isPositive: true,
  deltaPct: 0.8,
}

function StatCardView({ card, graphPath }: { card: StatCard; graphPath: string }) {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const [hover, setHover] = useState<{ index: number; left: number } | null>(null)

  const { points, path, values } = useMemo(() => {
    const raw = parsePathPoints(graphPath)
    const ys = raw.map((p) => p.y)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const rangeY = maxY - minY || 1
    const inner = GRAPH_HEIGHT - GRAPH_PADDING_Y * 2
    const pts = raw.map((p) => ({ x: p.x, y: GRAPH_PADDING_Y + ((p.y - minY) / rangeY) * inner }))
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y.toFixed(3)}`).join("")
    const vals = raw.map((p) => card.base * (1 + ((maxY - p.y) / rangeY - 0.5) * 2 * card.amplitude))
    return { points: pts, path: d, values: vals }
  }, [graphPath, card])

  const color = card.isPositive ? TONE_UP : TONE_DOWN
  const value = card.maskable && !showDollarAmounts ? MASK : card.value
  const active = hover ? points[hover.index] : null

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    const index = Math.round(ratio * (values.length - 1))
    const left = Math.max(84, Math.min(bounds.width - 84, event.clientX - bounds.left))
    setHover({ index, left })
  }

  return (
    <div
      className={cn(HIGHLIGHT_CARD_CLASS, "h-[176px] w-full")}
      onPointerMove={handleMove}
      onPointerLeave={() => setHover(null)}
    >
      <div className="absolute inset-x-6 top-5 z-10">
        <div className="text-[13px] text-muted-foreground dark:text-white/48">{t(card.label)}</div>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
            {value}
          </span>
          {card.deltaPct !== undefined ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[15px] font-medium tabular-nums",
                card.deltaPct >= 0 ? "text-success" : "text-rose-600 dark:text-rose-400",
              )}
            >
              <span aria-hidden className="text-[13px]">
                {card.deltaPct >= 0 ? "↗" : "↘"}
              </span>
              {Math.abs(card.deltaPct)}%
            </span>
          ) : null}
        </div>
      </div>

      {active && hover ? (
        <div
          className="pointer-events-none absolute top-[10px] z-30 w-[168px] -translate-x-1/2 rounded-radius-sm border border-border bg-card/95 px-2.5 py-2 text-foreground shadow-md backdrop-blur-sm dark:border-white/15 dark:bg-[#1b1b1c]/95"
          style={{ left: hover.left }}
        >
          <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-muted-foreground">
            <span>{t("Today")}</span>
            <span>{TIME_LABELS[Math.round((hover.index / (values.length - 1)) * (TIME_LABELS.length - 1))]}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-[10px] dark:border-white/10">
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
              {t(card.label)}
            </span>
            <span className="font-medium text-foreground">
              {card.maskable && !showDollarAmounts ? MASK : formatValue(values[hover.index], card.format)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-4 bottom-3 top-[98px]">
        {active ? (
          <>
            <span
              className="absolute bottom-0 top-0 z-10 w-px bg-foreground/15"
              style={{ left: `${(active.x / GRAPH_WIDTH) * 100}%` }}
            />
            <span
              className="absolute z-20 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1c1c1d] ring-1 ring-white/15"
              style={{ left: `${(active.x / GRAPH_WIDTH) * 100}%`, top: `${(active.y / GRAPH_HEIGHT) * 100}%` }}
            >
              <span
                className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: color }}
              />
            </span>
          </>
        ) : null}
        <svg viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} preserveAspectRatio="none" className="h-full w-full">
          <path
            d={path}
            fill="transparent"
            stroke={color}
            strokeWidth="1.25"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  )
}

export function PortfolioStatCards() {
  const { t } = useTranslation()
  const { showDollarAmounts, setShowDollarAmounts } = useAmountDisplayPreferences()
  const { scrollerRef, canPrev, canNext, scrollByCard } = useOverflowCarousel()

  const walletCard = useWalletBalanceCard()
  const cards: StatCard[] = [walletCard, NET_VALUE_CARD, NET_APY_CARD]

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
            {t("Your Dashboard")}
          </h2>
          <button
            type="button"
            onClick={() => setShowDollarAmounts(!showDollarAmounts)}
            aria-label={showDollarAmounts ? t("Hide Numbers") : t("Show Numbers")}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {showDollarAmounts ? <Eye className="size-[22px]" /> : <EyeOff className="size-[22px]" />}
          </button>
        </div>
        {canPrev || canNext ? (
          <CarouselArrowButtons
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => scrollByCard(-1)}
            onNext={() => scrollByCard(1)}
            prevLabel={t("Previous")}
            nextLabel={t("Next")}
          />
        ) : null}
      </div>

      <div className="overflow-hidden">
        <div
          ref={scrollerRef}
          className="overflow-x-auto pb-1 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex w-full gap-3">
            {cards.map((card, i) => (
              <li
                key={card.key}
                data-carousel-card
                className="w-[min(320px,88%)] shrink-0 snap-start sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)]"
              >
                <StatCardView card={card} graphPath={FEATURED_PATHS[i % FEATURED_PATHS.length]!} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
