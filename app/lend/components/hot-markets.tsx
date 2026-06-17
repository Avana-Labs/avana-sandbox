"use client"

import Image from "next/image"
import Link from "next/link"
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type AssetId = "gho" | "usdt" | "usdc"

type FeaturedAsset = {
  id: AssetId
  symbol: string
  displayName: string
  eyebrow: string
  apy: number
  tone: "green" | "blue"
  iconUrl: string
  path: string
}

type HoverState = {
  cardKey: string
  pointIndex: number
  tooltipLeft: number
}

const ASSETS: Record<AssetId, FeaturedAsset> = {
  gho: {
    id: "gho",
    symbol: "GHO",
    displayName: "Gho Token",
    eyebrow: "Bluechip • Prime",
    apy: 1.99,
    tone: "green",
    iconUrl:
      "https://token-logos.family.co/asset?id=1:0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f&token=GHO",
    path: "M0,14.857L4.714,14.857L9.429,14.856L14.143,14.856L18.857,14.855L23.571,14.855L28.286,14.854L33,14.854L37.714,14.853L42.429,14.853L47.143,14.852L51.857,14.852L56.571,14.851L61.286,14.851L66,14.85L70.714,14.85L75.429,14.849L80.143,14.849L84.857,14.848L89.571,14.848L94.286,14.847L99,14.847L103.714,14.846L108.429,14.846L113.143,14.845L117.857,14.845L122.571,14.844L127.286,14.843L132,14.843L136.714,14.842L141.429,14.842L146.143,14.841L150.857,14.841L155.571,14.84L160.286,14.84L165,14.839L169.714,14.839L174.429,14.644L179.143,26.623L183.857,26.622L188.571,26.622L193.286,26.621L198,26.621L202.714,26.62L207.429,26.62L212.143,26.619L216.857,26.619L221.571,26.618L226.286,26.618L231,26.617L235.714,26.617L240.429,26.616L245.143,26.616L249.857,26.615L254.571,26.787L259.286,26.787L264,26.786L268.714,26.786L273.429,26.785L278.143,26.785L282.857,26.784L287.571,26.784L292.286,26.783L297,26.783L301.714,26.782L306.429,26.782L311.143,26.781L315.857,26.337L320.571,26.337L325.286,26.337L330,26.336L334.714,26.336L339.429,26.335L344.143,26.335L348.857,26.334L353.571,26.334L358.286,35.196L363,63.019L367.714,63.018L372.429,93.76L377.143,93.759L381.857,93.759L386.571,93.758L391.286,93.758L396,93.757",
  },
  usdt: {
    id: "usdt",
    symbol: "USDT",
    displayName: "Tether USD",
    eyebrow: "Bluechip • Prime",
    apy: 2.54,
    tone: "green",
    iconUrl: "https://cryptologos.cc/logos/tether-usdt-logo.png",
    path: "M0,26.694L4.714,29.953L9.429,29.952L14.143,29.952L18.857,29.952L23.571,29.951L28.286,29.951L33,29.32L37.714,29.32L42.429,12.005L47.143,12.005L51.857,12.005L56.571,12.004L61.286,12.004L66,22.388L70.714,22.387L75.429,22.387L80.143,22.387L84.857,22.386L89.571,22.386L94.286,22.386L99,24.558L103.714,24.557L108.429,24.557L113.143,24.557L117.857,24.556L122.571,24.556L127.286,27.279L132,27.278L136.714,27.278L141.429,27.278L146.143,27.277L150.857,27.277L155.571,27.269L160.286,27.264L165,27.749L169.714,27.749L174.429,27.748L179.143,27.748L183.857,27.852L188.571,27.851L193.286,31.3L198,30L202.714,28.7L207.429,90.468L212.143,90.107L216.857,89.775L221.571,89.774L226.286,89.774L231,89.701L235.714,81.034L240.429,80.817L245.143,80.81L249.857,80.809L254.571,81.098L259.286,81.098L264,79.653L268.714,79.653L273.429,79.118L278.143,79.118L282.857,78.979L287.571,78.697L292.286,78.465L297,78.467L301.714,78.467L306.429,74.299L311.143,74.299L315.857,74.299L320.571,74.298L325.286,73.85L330,73.849L334.714,73.849L339.429,73.849L344.143,73.394L348.857,73.394L353.571,73.364L358.286,73.552L363,73.479L367.714,65.417L372.429,55.922L377.143,57.588L381.857,57.833L386.571,57.616L391.286,57.616L396,57.616",
  },
  usdc: {
    id: "usdc",
    symbol: "USDC",
    displayName: "USD Coin",
    eyebrow: "Bluechip • Prime",
    apy: 3.46,
    tone: "blue",
    iconUrl: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
    path: "M0,46.815L4.714,46.814L9.429,46.793L14.143,46.793L18.857,46.792L23.571,46.792L28.286,46.792L33,46.843L37.714,46.739L42.429,46.738L47.143,45.17L51.857,45.17L56.571,45.065L61.286,45.065L66,45.023L70.714,45.022L75.429,44.917L80.143,44.917L84.857,44.499L89.571,44.498L94.286,44.498L99,48.519L103.714,43.579L108.429,44.813L113.143,44.812L117.857,44.812L122.571,44.812L127.286,44.811L132,44.647L136.714,44.646L141.429,44.646L146.143,44.941L150.857,45.678L155.571,54.253L160.286,50.921L165,50.921L169.714,50.92L174.429,50.92L179.143,50.837L183.857,50.806L188.571,50.805L193.286,50.805L198,50.805L202.714,50.804L207.429,53.937L212.143,56.974L216.857,56.973L221.571,56.973L226.286,61.656L231,61.656L235.714,62.139L240.429,62.138L245.143,60.142L249.857,60.142L254.571,60.088L259.286,60.087L264,60.087L268.714,60.087L273.429,58.612L278.143,53.935L282.857,54.303L287.571,55.8L292.286,68.329L297,92.938L301.714,92.965L306.429,51.815L311.143,51.814L315.857,51.814L320.571,16.845L325.286,16.845L330,29.771L334.714,29.771L339.429,29.817L344.143,29.817L348.857,29.816L353.571,52.806L358.286,53.041L363,53.041L367.714,53.123L372.429,53.534L377.143,55.008L381.857,44.619L386.571,42.98L391.286,48.42L396,48.419",
  },
}

const FEATURED_SEQUENCE: AssetId[] = ["usdt", "usdc", "gho"]
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
}: {
  asset: FeaturedAsset
  cardKey: string
  hover: HoverState | null
  onHover: (state: HoverState) => void
  onLeave: () => void
}) {
  const points = useMemo(() => parsePathPoints(asset.path), [asset.path])
  const isHovered = hover?.cardKey === cardKey

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
      className={cn(
        "relative block h-[176px] w-[372px] shrink-0 overflow-hidden rounded-2xl border text-left",
        "border-[#e1e4e8] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        "dark:border-[#26272a] dark:bg-[#1b1b1c] dark:shadow-none",
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0 opacity-100 [background-image:radial-gradient(circle,rgba(148,163,184,0.28)_1px,transparent_1.15px)] [background-position:0_4px] [background-size:16px_16px] dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1.15px)]" />
      <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]" />

      <img
        alt=""
        aria-hidden="true"
        width="96"
        height="96"
        className="pointer-events-none absolute -left-5 top-16 size-[274px] rounded-full object-cover opacity-10 blur-2xl saturate-150"
        loading="lazy"
        decoding="async"
        src={asset.iconUrl}
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
          <div className="text-[15px] font-medium tracking-[-0.03em]">{asset.apy.toFixed(2)}%</div>
          <div className="mt-1 text-[13px] text-muted-foreground dark:text-white/48">APY</div>
        </div>
      </div>

      {isHovered && hover ? (
        <HoverTooltip asset={asset} pointIndex={hover.pointIndex} left={hover.tooltipLeft} />
      ) : null}

      <ReferenceGraph asset={asset} activePointIndex={isHovered ? hover.pointIndex : null} />
    </Link>
  )
}

export function HotMarkets() {
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
    FEATURED_SEQUENCE.map((assetId, index) => {
      const cardKey = `${copy}-${assetId}-${index}`
      return (
        <FeaturedCard
          key={cardKey}
          asset={ASSETS[assetId]}
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
              {renderSequence("b")}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
