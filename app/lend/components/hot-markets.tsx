"use client"

import Image from "next/image"
import Link from "next/link"
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type HoverState = {
  cardKey: string
  pointIndex: number
  tooltipLeft: number
}

type FeaturedAsset = LendPageData["featuredAssets"][keyof LendPageData["featuredAssets"]]
type FeaturedSnapshot = LendPageData["featuredSnapshots"][number]
const TIME_LABELS = ["12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM", "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM"]
const MARQUEE_DURATION_SECONDS = 38
const GRAPH_WIDTH = 396
const GRAPH_HEIGHT = 72
const GRAPH_PADDING_Y = 8

function parsePathPoints(path: string) {
  return Array.from(path.matchAll(/[ML]([\d.]+),([\d.]+)/g), (match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }))
}

function normalizeGraphPath(path: string) {
  const points = parsePathPoints(path)
  if (points.length === 0) {
    return { path: "", points: [], width: GRAPH_WIDTH, height: GRAPH_HEIGHT }
  }

  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const rangeY = maxY - minY || 1
  const innerHeight = GRAPH_HEIGHT - GRAPH_PADDING_Y * 2

  const normalized = points.map((point) => ({
    x: point.x,
    y: GRAPH_PADDING_Y + ((point.y - minY) / rangeY) * innerHeight,
  }))

  const normalizedPath = normalized
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y.toFixed(3)}`)
    .join("")

  return { path: normalizedPath, points: normalized, width: GRAPH_WIDTH, height: GRAPH_HEIGHT }
}

export function AssetIcon({ asset }: { asset: FeaturedAsset }) {
  return (
    <span
      className="relative inline-flex size-[56px] shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: 56, height: 56 }}
    >
      <Image
        src={asset.iconUrl}
        alt={`${asset.symbol} logo`}
        fill
        sizes="56px"
        className="object-contain"
        unoptimized
        // Featured asset icons are the largest above-the-fold imagery on /lend, so
        // eager-load them to improve LCP instead of lazy-loading below-hero.
        priority
      />
    </span>
  )
}

function HoverTooltip({
  asset,
  pointIndex,
  left,
}: {
  asset: FeaturedAsset
  pointIndex: number
  left: number
}) {
  const { t } = useTranslation()
  const points = useMemo(() => parsePathPoints(asset.path), [asset.path])
  const point = points[pointIndex] ?? points[0]
  const timeIndex = Math.round((pointIndex / Math.max(points.length - 1, 1)) * (TIME_LABELS.length - 1))
  const deviation = ((60 - point.y) / 60) * 0.34
  const value = Math.max(0, asset.apy + deviation)

  return (
    <div
      className="pointer-events-none absolute top-[10px] z-30 w-[168px] -translate-x-1/2 rounded-radius-sm border border-border bg-card/95 px-2.5 py-2 text-foreground shadow-md backdrop-blur-sm dark:border-white/15 dark:bg-[#1b1b1c]/95"
      style={{ left }}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-muted-foreground">
        <span>{t("Today")}</span>
        <span>{TIME_LABELS[timeIndex]}</span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[10px] dark:border-white/10">
        <span className="flex items-center gap-1.5 text-success">
          <span className="size-2 rounded-full bg-emerald-500 dark:bg-[#73dca9]" />
          {t("Borrow APY")}
        </span>
        <span className="font-medium text-foreground">{value.toFixed(2)}%</span>
      </div>
    </div>
  )
}

function ReferenceGraph({
  asset,
  activePointIndex,
}: {
  asset: FeaturedAsset
  activePointIndex: number | null
}) {
  const graph = useMemo(() => normalizeGraphPath(asset.path), [asset.path])
  const point = activePointIndex == null ? null : graph.points[activePointIndex]
  const stroke = asset.tone === "blue" ? "#78c9e8" : "#58d89a"

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-3 top-[98px]">
      {point ? (
        <>
          <span
            className="absolute bottom-0 top-0 z-10 w-px bg-card/48"
            style={{ left: `${(point.x / graph.width) * 100}%` }}
          />
          <span
            className="absolute z-20 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1c1c1d] ring-1 ring-white/15"
            style={{ left: `${(point.x / graph.width) * 100}%`, top: `${(point.y / graph.height) * 100}%` }}
          >
            <span
              className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: stroke }}
            />
          </span>
        </>
      ) : null}
      <svg
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <path
          d={graph.path}
          fill="transparent"
          stroke={stroke}
          strokeWidth="1.25"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

function FeaturedCard({
  asset,
  apyPct,
  cardKey,
  href,
  hover,
  onHover,
  onLeave,
  interactive = true,
}: {
  asset: FeaturedAsset
  apyPct: number
  cardKey: string
  href: string
  hover: HoverState | null
  onHover: (state: HoverState) => void
  onLeave: () => void
  interactive?: boolean
}) {
  const points = useMemo(() => parsePathPoints(asset.path), [asset.path])
  const isHovered = hover?.cardKey === cardKey
  const cardContent = (
    <>
      <div className="pointer-events-none absolute inset-0 z-0 opacity-100 [background-image:radial-gradient(circle,rgba(148,163,184,0.28)_1px,transparent_1.15px)] [background-position:0_4px] [background-size:16px_16px] dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1.15px)]" />
      <div className="pointer-events-none absolute inset-0 z-0 rounded-radius-lg bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]" />

      <Image
        src={asset.iconUrl}
        alt=""
        aria-hidden="true"
        width={274}
        height={274}
        className="pointer-events-none absolute -left-5 top-16 size-[274px] rounded-full object-cover opacity-10 blur-lg saturate-150"
        loading="lazy"
        decoding="async"
        unoptimized
      />

      <div className="absolute left-6 right-6 top-6 z-10 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <AssetIcon asset={asset} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium tracking-[-0.03em]">{asset.displayName}</div>
            <div className="mt-1 text-[13px] text-muted-foreground dark:text-white/48">{asset.eyebrow}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[15px] font-medium tracking-[-0.03em]">{apyPct.toFixed(2)}%</div>
          <div className="mt-1 text-[13px] text-muted-foreground dark:text-white/48">APY</div>
        </div>
      </div>

      {isHovered && hover ? (
        <HoverTooltip asset={asset} pointIndex={hover.pointIndex} left={hover.tooltipLeft} />
      ) : null}

      <ReferenceGraph asset={asset} activePointIndex={isHovered ? hover.pointIndex : null} />
    </>
  )

  const cardClassName = cn(
    "relative block h-[176px] w-[372px] shrink-0 overflow-hidden rounded-radius-lg border text-left",
    "border-[#e1e4e8] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
    "dark:border-[#26272a] dark:bg-[#1b1b1c] dark:shadow-none",
  )

  if (!interactive) {
    return (
      <div aria-hidden="true" className={cardClassName}>
        {cardContent}
      </div>
    )
  }

  return (
    <Link
      data-featured-card={cardKey}
      href={href}
      onMouseLeave={onLeave}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
        const pointIndex = Math.round(ratio * (points.length - 1))
        const tooltipLeft = Math.max(84, Math.min(bounds.width - 84, event.clientX - bounds.left))
        onHover({ cardKey, pointIndex, tooltipLeft })
      }}
      className={cardClassName}
    >
      {cardContent}
    </Link>
  )
}

export function HotMarkets({
  assets,
  sequence,
  snapshots = [],
}: {
  assets: LendPageData["featuredAssets"]
  sequence: LendPageData["featuredSequence"]
  snapshots?: ReadonlyArray<FeaturedSnapshot>
}) {
  const { t } = useTranslation()
  const [hover, setHover] = useState<HoverState | null>(null)
  const [carouselHovered, setCarouselHovered] = useState(false)
  const [sequenceWidth, setSequenceWidth] = useState(0)
  const sequenceRef = useRef<HTMLDivElement | null>(null)
  const x = useMotionValue(0)
  const reduceMotion = useReducedMotion()
  const marqueePaused = hover !== null || carouselHovered || reduceMotion

  useEffect(() => {
    const sequence = sequenceRef.current
    if (!sequence) return

    const updateWidth = () => {
      setSequenceWidth(sequence.offsetWidth)
      x.set(0)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(sequence)
    return () => observer.disconnect()
  }, [x])

  useAnimationFrame((_, delta) => {
    if (marqueePaused || sequenceWidth === 0) return

    const speed = sequenceWidth / MARQUEE_DURATION_SECONDS
    const nextX = x.get() - speed * (delta / 1000)
    x.set(nextX <= -sequenceWidth ? nextX + sequenceWidth : nextX)
  })

  const snapshotForAsset = (assetId: (typeof sequence)[number]) => {
    const asset = assets[assetId]
    return snapshots.find(
      (entry) => entry.marketId === assetId || entry.symbol.toUpperCase() === asset.symbol.toUpperCase(),
    )
  }

  const renderSequence = (copy: "a" | "b", interactive = true) =>
    sequence.map((assetId, index) => {
      const cardKey = `${copy}-${assetId}-${index}`
      const snapshot = snapshotForAsset(assetId)
      return (
        <FeaturedCard
          key={cardKey}
          asset={assets[assetId]}
          apyPct={snapshot?.supplyApyPct ?? assets[assetId].apy}
          href={snapshot?.href ?? `/lend/markets/${assetId}`}
          cardKey={cardKey}
          hover={hover}
          onHover={setHover}
          onLeave={() => setHover(null)}
          interactive={interactive}
        />
      )
    })

  return (
    <section>
      <div className="w-full">
        <h2 className="mb-5 mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">
          {t("Featured")}
        </h2>

        <div
          data-featured-carousel
          className="relative h-[176px] w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent_0,black_1rem,black_calc(100%-1rem),transparent_100%)]"
          onMouseEnter={() => setCarouselHovered(true)}
          onMouseLeave={() => {
            setCarouselHovered(false)
            setHover(null)
          }}
          onPointerEnter={() => setCarouselHovered(true)}
          onPointerLeave={() => {
            setCarouselHovered(false)
            setHover(null)
          }}
        >
          {/* Left padding offsets the mask's left fade zone so the leading card is
              fully visible at rest; it sits outside the measured sequence so the
              marquee loop width (sequenceRef) is unaffected. */}
          <motion.div style={{ x }} className="flex w-max items-start pl-4 sm:pl-6">
            <div ref={sequenceRef} className="flex shrink-0 items-start gap-3 pr-3">
              {renderSequence("a")}
            </div>
            <div aria-hidden="true" className="flex shrink-0 items-start gap-3 pr-3">
              {renderSequence("b", false)}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
