"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const STEP = 0.1
const TICK_WIDTH = 36

function formatMultiplier(value: number) {
  return Number.isInteger(value) ? `${value}x` : `${value.toFixed(1)}x`
}

function parseMultiplier(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function clampMultiplier(value: number, min: number, max: number) {
  const rounded = Math.round(value * 10) / 10
  return Math.min(max, Math.max(min, rounded))
}

function buildTicks(min: number, max: number) {
  const ticks: number[] = []
  for (let current = min; current <= max + 1e-9; current = Math.round((current + STEP) * 10) / 10) {
    ticks.push(current)
  }
  return ticks
}

export function ActionLeverageScrollPicker({
  value,
  onChange,
  min,
  max,
  label = "Leverage",
  showLiquidationMaxMessage = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  min: number
  max: number
  label?: string
  showLiquidationMaxMessage?: boolean
  className?: string
}) {
  const ticks = useMemo(() => buildTicks(min, max), [min, max])
  const parsed = parseMultiplier(value)
  const activeValue = parsed != null ? clampMultiplier(parsed, min, max) : min
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null)
  const programmaticScrollRef = useRef(false)
  const scrollEndTimerRef = useRef<number | null>(null)
  const [ready, setReady] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const readCenterTick = useCallback(() => {
    const container = scrollRef.current
    if (!container) return activeValue
    const center = container.scrollLeft + container.clientWidth / 2
    const index = Math.round(center / TICK_WIDTH)
    return ticks[Math.min(Math.max(index, 0), ticks.length - 1)] ?? activeValue
  }, [activeValue, ticks])

  const scrollToValue = useCallback(
    (nextValue: number, behavior: ScrollBehavior = "smooth") => {
      const index = ticks.findIndex((tick) => Math.abs(tick - nextValue) < 1e-9)
      if (index < 0 || !scrollRef.current) return
      const centerOffset = scrollRef.current.clientWidth / 2 - TICK_WIDTH / 2
      const left = index * TICK_WIDTH - centerOffset
      programmaticScrollRef.current = true
      if (typeof scrollRef.current.scrollTo === "function") {
        scrollRef.current.scrollTo({ left, behavior })
      } else {
        scrollRef.current.scrollLeft = left
      }
      window.setTimeout(
        () => {
          programmaticScrollRef.current = false
        },
        behavior === "smooth" ? 320 : 0,
      )
    },
    [ticks],
  )

  const commitScrollPosition = useCallback(() => {
    const tick = readCenterTick()
    const next = String(tick)
    if (next !== value) onChange(next)
    scrollToValue(tick, "smooth")
  }, [onChange, readCenterTick, scrollToValue, value])

  const handleScroll = useCallback(() => {
    if (programmaticScrollRef.current || dragRef.current) return
    if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current)
    scrollEndTimerRef.current = window.setTimeout(() => {
      commitScrollPosition()
    }, 90)
  }, [commitScrollPosition])

  useEffect(() => {
    scrollToValue(activeValue, ready ? "smooth" : "auto")
    if (!ready) setReady(true)
  }, [activeValue, ready, scrollToValue])

  useEffect(() => {
    const endDrag = () => {
      if (!dragRef.current) return
      dragRef.current = null
      setIsDragging(false)
      commitScrollPosition()
    }

    window.addEventListener("pointerup", endDrag)
    window.addEventListener("pointercancel", endDrag)
    return () => {
      window.removeEventListener("pointerup", endDrag)
      window.removeEventListener("pointercancel", endDrag)
      if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current)
    }
  }, [commitScrollPosition])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return
    dragRef.current = {
      startX: event.clientX,
      startScrollLeft: scrollRef.current.scrollLeft,
    }
    setIsDragging(true)
    if (typeof scrollRef.current.setPointerCapture === "function") {
      scrollRef.current.setPointerCapture(event.pointerId)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || !scrollRef.current) return
    scrollRef.current.scrollLeft = drag.startScrollLeft - (event.clientX - drag.startX)
    const tick = readCenterTick()
    const next = String(tick)
    if (next !== value) onChange(next)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return
    if (typeof scrollRef.current.releasePointerCapture === "function") {
      scrollRef.current.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    setIsDragging(false)
    commitScrollPosition()
  }

  return (
    <div
      data-testid="action-leverage-scroll-picker"
      className={cn("overflow-hidden rounded-[20px] border border-border bg-surface-raised px-4 py-5", className)}
    >
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Min"
          onClick={() => onChange(String(min))}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Min
        </button>

        <div data-testid="leverage-value" className="text-[clamp(2rem,8vw,2.75rem)] font-medium tracking-[-0.05em] text-foreground">
          {formatMultiplier(activeValue)}
        </div>

        <button
          type="button"
          aria-label="Max"
          onClick={() => onChange(String(max))}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Max
        </button>
      </div>

      <div className="relative mt-5">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-foreground" aria-hidden />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={cn(
            "touch-pan-x overflow-x-auto px-[calc(50%-18px)] select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{ scrollSnapType: "x mandatory" }}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={activeValue}
          aria-label="Leverage multiplier"
        >
          <div className="flex items-end" style={{ width: ticks.length * TICK_WIDTH }}>
            {ticks.map((tick) => {
              const major = Number.isInteger(tick)
              return (
                <div
                  key={tick}
                  className="flex shrink-0 flex-col items-center justify-end"
                  style={{ width: TICK_WIDTH, scrollSnapAlign: "center" }}
                >
                  {major ? (
                    <span className="mb-2 text-[11px] font-medium tabular-nums text-muted-foreground">{tick}</span>
                  ) : (
                    <span className="mb-2 h-3" aria-hidden />
                  )}
                  <span className={cn("w-px bg-border", major ? "h-5" : "h-3")} aria-hidden />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showLiquidationMaxMessage ? (
        <p data-testid="leverage-max-risk" className="mt-4 text-center text-[13px] font-medium text-rose-300">
          MAX — this multiplier puts your position at risk of liquidation
        </p>
      ) : null}
    </div>
  )
}
