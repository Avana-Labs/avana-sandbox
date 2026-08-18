"use client"

/**
 * "Your Dashboard" summary section: a title with an eye (numbers) toggle and
 * ‹ › arrows, over an auto-scrolling carousel of stat cards — Net Value, Total
 * Value, Total APR, Supplied, Borrowed, Earned, Multiply Exposure. Each card is
 * the Lend "Featured" card: same HIGHLIGHT_CARD_CLASS shell, same line chart
 * (the real LEND_FEATURED_ASSETS paths, normalized exactly like that page), and
 * the same hover popup. The carousel is the shared HighlightCarousel marquee.
 *
 * UI-only phase — mock values (some metrics have no live data yet). Wiring later
 * feeds real portfolio totals + per-metric series; the card shape stays as-is.
 */

import { useMemo, useRef, useState, type PointerEvent } from "react"
import { cn } from "@/lib/utils"
import {
  HIGHLIGHT_CARD_CLASS,
  HighlightCarousel,
  type HighlightCarouselHandle,
} from "@/app/components/highlight-carousel"
import { CarouselArrowButtons } from "@/app/components/carousel-arrow-buttons"
import { Eye, EyeOff } from "@/app/components/icons"
import { LEND_FEATURED_ASSETS } from "@/app/lib/data/catalog/lend/featured-assets"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const MASK = "••••"

// Match the Lend Featured graph geometry + tone colors.
const GRAPH_WIDTH = 396
const GRAPH_HEIGHT = 72
const GRAPH_PADDING_Y = 8
const TONE_UP = "#58d89a"
const TONE_DOWN = "#f0444c"

// The exact curves the Lend "Featured" cards draw.
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
  /** The metric's current level; hover values derive from this ± amplitude. */
  base: number
  amplitude: number
  maskable: boolean
  isPositive: boolean
  deltaPct?: number
  claim?: boolean
}

const CARDS: StatCard[] = [
  {
    key: "net-value",
    label: "Net Value",
    value: "$549.94",
    format: "usdCents",
    base: 549.94,
    amplitude: 0.05,
    maskable: true,
    isPositive: true,
    deltaPct: 2.5,
  },
  {
    key: "total-value",
    label: "Total Value",
    value: "$6,300",
    format: "usd",
    base: 6300,
    amplitude: 0.03,
    maskable: true,
    isPositive: true,
    deltaPct: 2.5,
  },
  {
    key: "total-apr",
    label: "Total APR",
    value: "14.2%",
    format: "percent",
    base: 14.2,
    amplitude: 0.06,
    maskable: false,
    isPositive: false,
    deltaPct: -0.8,
  },
  {
    key: "supplied",
    label: "Supplied",
    value: "$5,204",
    format: "usd",
    base: 5204,
    amplitude: 0.025,
    maskable: true,
    isPositive: true,
    deltaPct: 1.2,
  },
  {
    key: "borrowed",
    label: "Borrowed",
    value: "$1,240",
    format: "usd",
    base: 1240,
    amplitude: 0.04,
    maskable: true,
    isPositive: false,
    deltaPct: -0.9,
  },
  {
    key: "earned",
    label: "Earned",
    value: "$214.7",
    format: "usdCents",
    base: 214.7,
    amplitude: 0.05,
    maskable: true,
    isPositive: true,
    claim: true,
  },
  {
    key: "multiply-exposure",
    label: "Multiply Exposure",
    value: "$3,180",
    format: "usd",
    base: 3180,
    amplitude: 0.05,
    maskable: true,
    isPositive: true,
    deltaPct: 4.1,
  },
]

/** Parse the "M0,14L4.7,14…" featured path into raw {x, y} points. */
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

function StatCardView({ card, graphPath, interactive }: { card: StatCard; graphPath: string; interactive: boolean }) {
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
    // Same normalization as the Lend page's normalizeGraphPath.
    const pts = raw.map((p) => ({ x: p.x, y: GRAPH_PADDING_Y + ((p.y - minY) / rangeY) * inner }))
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y.toFixed(3)}`).join("")
    // Higher on the chart (smaller y) → higher value.
    const vals = raw.map((p) => card.base * (1 + ((maxY - p.y) / rangeY - 0.5) * 2 * card.amplitude))
    return { points: pts, path: d, values: vals }
  }, [graphPath, card])

  const color = card.isPositive ? TONE_UP : TONE_DOWN
  const value = card.maskable && !showDollarAmounts ? MASK : card.value
  const active = hover ? points[hover.index] : null

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    const index = Math.round(ratio * (values.length - 1))
    const left = Math.max(84, Math.min(bounds.width - 84, event.clientX - bounds.left))
    setHover({ index, left })
  }

  return (
    <div
      className={cn(HIGHLIGHT_CARD_CLASS, "h-[176px] w-[min(372px,calc(100vw-2rem))]")}
      onPointerMove={handleMove}
      onPointerLeave={() => setHover(null)}
    >
      <div className="absolute inset-x-6 top-5 z-10">
        <div className="text-[13px] text-muted-foreground dark:text-white/48">{t(card.label)}</div>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
            {value}
          </span>
          {card.claim ? (
            <button
              type="button"
              className="rounded-full border border-border bg-background px-3.5 py-1 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t("Claim")}
            </button>
          ) : card.deltaPct !== undefined ? (
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
  const carouselRef = useRef<HighlightCarouselHandle>(null)

  const renderSequence = (interactive: boolean) =>
    CARDS.map((card, i) => (
      <StatCardView
        key={`${interactive ? "a" : "b"}-${card.key}`}
        card={card}
        graphPath={FEATURED_PATHS[i % FEATURED_PATHS.length]}
        interactive={interactive}
      />
    ))

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
        <CarouselArrowButtons
          canPrev
          canNext
          onPrev={() => carouselRef.current?.step(-1)}
          onNext={() => carouselRef.current?.step(1)}
          prevLabel={t("Previous")}
          nextLabel={t("Next")}
        />
      </div>

      <HighlightCarousel
        ref={carouselRef}
        className="h-[176px]"
        durationSeconds={104}
        renderSequence={renderSequence}
      />
    </div>
  )
}
