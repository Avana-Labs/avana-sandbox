"use client"

import Image from "next/image"
import Link from "next/link"
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { cn } from "@/lib/utils"

type HoverState = {
  cardKey: string
  pointIndex: number
  tooltipLeft: number
}

type FeaturedAsset = LendPageData["featuredAssets"][keyof LendPageData["featuredAssets"]]
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

function AssetIcon({ asset }: { asset: FeaturedAsset }) {
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
  const points = useMemo(() => parsePathPoints(asset.path), [asset.path])
  const point = points[pointIndex] ?? points[0]
  const timeIndex = Math.round((pointIndex / Math.max(points.length - 1, 1)) * (TIME_LABELS.length - 1))
  const deviation = ((60 - point.y) / 60) * 0.34
  const value = Math.max(0, asset.apy + deviation)

  return (
    <div
      className="pointer-events-none absolute top-[16px] z-30 w-[226px] -translate-x-1/2 rounded-[14px] border border-white/10 bg-[#232325]/96 px-3.5 py-3 text-white shadow-[0_14px_32px_rgba(0,0,0,0.3)] backdrop-blur-md"
      style={{ left }}
    >
      <div className="flex items-center justify-between text-[11px] font-medium">
        <span>6/3/2026</span>
        <span className="text-white/60">{TIME_LABELS[timeIndex]}</span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px]">
        <span className="flex items-center gap-2 text-[#73dca9]">
          <span className="size-2.5 rounded-full bg-[#73dca9]" />
          Borrow APY
        </span>
        <span className="font-medium">{value.toFixed(2)}%</span>
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
            className="absolute bottom-0 top-0 z-10 w-px bg-white/48"
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
  cardKey,
  hover,
  onHover,
  onLeave,
  interactive = true,
}: {
  asset: FeaturedAsset
  cardKey: string
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
      <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]" />

      <div className="absolute left-6 right-6 top-6 z-10 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <AssetIcon asset={asset} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium tracking-[-0.03em]">{asset.displayName}</div>
            <div className="mt-1 text-[13px] text-muted-foreground dark:text-white/48">{asset.eyebrow}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[15px] font-medium tracking-[-0.03em]">{asset.apy.toFixed(2)}%</div>
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
    "relative block h-[176px] w-[372px] shrink-0 overflow-hidden rounded-2xl border text-left",
    "border-[#e1e4e8] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
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
      href={`/borrow/asset/${asset.id}`}
      onMouseLeave={onLeave}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
        const pointIndex = Math.round(ratio * (points.length - 1))
        const tooltipLeft = Math.max(113, Math.min(bounds.width - 113, event.clientX - bounds.left))
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
}: {
  assets: LendPageData["featuredAssets"]
  sequence: LendPageData["featuredSequence"]
}) {
  const [hover, setHover] = useState<HoverState | null>(null)
  const [sequenceWidth, setSequenceWidth] = useState(0)
  const sequenceRef = useRef<HTMLDivElement | null>(null)
  const x = useMotionValue(0)
  const reduceMotion = useReducedMotion()

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
    if (hover || reduceMotion || sequenceWidth === 0) return

    const speed = sequenceWidth / MARQUEE_DURATION_SECONDS
    const nextX = x.get() - speed * (delta / 1000)
    x.set(nextX <= -sequenceWidth ? nextX + sequenceWidth : nextX)
  })

  const renderSequence = (copy: "a" | "b") =>
    sequence.map((assetId, index) => {
      const cardKey = `${copy}-${assetId}-${index}`
      return (
        <FeaturedCard
          key={cardKey}
          asset={assets[assetId]}
          cardKey={cardKey}
          hover={hover}
          onHover={setHover}
          onLeave={() => setHover(null)}
        />
      )
    })

  return (
    <section>
      <div className="w-full">
        <h2 className="mb-5 mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">
          Featured
        </h2>

        <div
          data-featured-carousel
          className="relative h-[176px] w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_5%,black_95%,transparent_100%)]"
          onMouseLeave={() => setHover(null)}
          onPointerLeave={() => setHover(null)}
        >
          <motion.div style={{ x }} className="flex w-max items-start">
            <div ref={sequenceRef} className="flex shrink-0 items-start gap-3 pr-3">
              {renderSequence("a")}
            </div>
            <div aria-hidden="true" className="flex shrink-0 items-start gap-3 pr-3">
              {sequence.map((assetId, index) => (
                <FeaturedCard
                  key={`b-${assetId}-${index}`}
                  asset={assets[assetId]}
                  cardKey={`b-${assetId}-${index}`}
                  hover={hover}
                  onHover={setHover}
                  onLeave={() => setHover(null)}
                  interactive={false}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
