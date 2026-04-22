"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type Direction = "up" | "down"

type FlashValueProps = {
  /** The live value being tracked. A change between renders triggers a flash. */
  value: number | string
  /** Visual payload. Usually a formatted string of `value`. */
  children: ReactNode
  /**
   * Which direction counts as "good" (emerald flash). Defaults to "up".
   * Set to "down" for metrics where lower-is-better (debt, liq price, utilization).
   */
  goodDirection?: Direction
  /** Milliseconds the flash background stays visible. Default 500. */
  durationMs?: number
  /** Extra classes applied to the wrapper. */
  className?: string
  /**
   * Minimum absolute delta required to flash. Prevents rounding noise from
   * triggering flashes. Only applies when `value` is a number.
   */
  minDelta?: number
  /** Skip flashing on the first render. Default true. */
  skipInitial?: boolean
}

const FLASH_WINDOW_MS = 120
const MAX_FLASHES_PER_WINDOW = 6
const flashTimestamps: number[] = []

/**
 * Rolling-window budget so a single render tick cannot kick off a slot-machine
 * explosion of flashes across dozens of cells. Returns true if the flash
 * should proceed, false if budget is exhausted.
 */
function requestFlashBudget(): boolean {
  const now = Date.now()
  while (flashTimestamps.length > 0 && flashTimestamps[0] < now - FLASH_WINDOW_MS) {
    flashTimestamps.shift()
  }
  if (flashTimestamps.length >= MAX_FLASHES_PER_WINDOW) return false
  flashTimestamps.push(now)
  return true
}

function compare(prev: number | string | undefined, next: number | string): Direction | null {
  if (prev === undefined) return null
  if (typeof prev === "number" && typeof next === "number") {
    if (next > prev) return "up"
    if (next < prev) return "down"
    return null
  }
  const p = String(prev)
  const n = String(next)
  if (p === n) return null
  return "up"
}

/**
 * Wraps any node and briefly washes its background with a color when `value`
 * changes. Good direction: emerald. Bad direction: rose. Respects
 * prefers-reduced-motion by holding the tint statically (no fade animation).
 * Uses a rolling window to throttle flashes globally so simultaneous updates
 * across many cells don't produce a slot-machine effect.
 */
export function FlashValue({
  value,
  children,
  goodDirection = "up",
  durationMs = 500,
  className,
  minDelta = 0,
  skipInitial = true,
}: FlashValueProps) {
  const previousRef = useRef<number | string | undefined>(skipInitial ? value : undefined)
  const [flash, setFlash] = useState<Direction | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReducedMotion(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    const prev = previousRef.current
    const direction = compare(prev, value)
    previousRef.current = value
    if (!direction) return
    if (
      typeof prev === "number" &&
      typeof value === "number" &&
      Math.abs(value - prev) < minDelta
    ) {
      return
    }
    if (!requestFlashBudget()) return
    setFlash(direction)
    const timer = window.setTimeout(() => setFlash(null), durationMs)
    return () => window.clearTimeout(timer)
  }, [value, durationMs, minDelta])

  const isGood = flash ? flash === goodDirection : false
  const tint = flash
    ? isGood
      ? "bg-emerald-500/15"
      : "bg-rose-500/15"
    : "bg-transparent"

  return (
    <span
      className={cn(
        "relative inline-flex rounded-md px-0.5",
        reducedMotion ? "" : "transition-colors duration-300 ease-out",
        tint,
        className,
      )}
      data-flash={flash ?? undefined}
    >
      {children}
    </span>
  )
}
