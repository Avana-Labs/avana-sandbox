"use client"

import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Shared surface styling for the Lend "Featured" and Multiply "Trending"
 * highlight cards: a flat `bg-card` panel with no border, shadow, or sheen —
 * matching the Borrow "Explore" cards. Card dimensions are left to the caller
 * so each surface can size to its own content.
 */
export const HIGHLIGHT_CARD_CLASS =
  "relative block shrink-0 overflow-hidden rounded-radius-md border-0 bg-card text-left shadow-none"

const DEFAULT_MARQUEE_DURATION_SECONDS = 38

/**
 * Infinite auto-scrolling marquee shared by the highlight rows. The caller
 * supplies `renderSequence(interactive)`, which is drawn twice — once live and
 * once aria-hidden — so the loop is seamless. The marquee pauses while hovered
 * and whenever the viewer prefers reduced motion. `onHoverChange` lets callers
 * that layer their own hover UI (e.g. the Lend graph tooltip) reset it on exit.
 */
export function HighlightCarousel({
  renderSequence,
  className,
  gapClassName = "gap-3",
  leadPadClassName = "pl-4 sm:pl-6",
  durationSeconds = DEFAULT_MARQUEE_DURATION_SECONDS,
  onHoverChange,
}: {
  renderSequence: (interactive: boolean) => ReactNode
  className?: string
  gapClassName?: string
  leadPadClassName?: string
  durationSeconds?: number
  onHoverChange?: (hovered: boolean) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [sequenceWidth, setSequenceWidth] = useState(0)
  const sequenceRef = useRef<HTMLDivElement | null>(null)
  const x = useMotionValue(0)
  const reduceMotion = useReducedMotion()
  const paused = hovered || reduceMotion

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
    if (paused || sequenceWidth === 0) return
    const speed = sequenceWidth / durationSeconds
    const nextX = x.get() - speed * (delta / 1000)
    x.set(nextX <= -sequenceWidth ? nextX + sequenceWidth : nextX)
  })

  const setHover = (next: boolean) => {
    setHovered(next)
    onHoverChange?.(next)
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent_0,black_1rem,black_calc(100%-1rem),transparent_100%)]",
        className,
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {/* Left padding offsets the mask's left fade zone so the leading card is
          fully visible at rest; it sits outside the measured sequence so the
          marquee loop width (sequenceRef) is unaffected. */}
      <motion.div style={{ x }} className={cn("flex w-max items-start", leadPadClassName)}>
        <div ref={sequenceRef} className={cn("flex shrink-0 items-start pr-3", gapClassName)}>
          {renderSequence(true)}
        </div>
        <div aria-hidden="true" className={cn("flex shrink-0 items-start pr-3", gapClassName)}>
          {renderSequence(false)}
        </div>
      </motion.div>
    </div>
  )
}
