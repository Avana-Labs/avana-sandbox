"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/app/lib/use-media-query"

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
  const [isVisible, setIsVisible] = useState(true)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const sequenceRef = useRef<HTMLDivElement | null>(null)
  const sequenceWidthRef = useRef(0)
  const xRef = useRef(0)
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const paused = hovered || reduceMotion || !isVisible

  useEffect(() => {
    const sequence = sequenceRef.current
    const track = trackRef.current
    if (!sequence || !track) return

    const updateWidth = () => {
      sequenceWidthRef.current = sequence.offsetWidth
      xRef.current = 0
      track.style.transform = "translate3d(0px, 0, 0)"
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(sequence)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting))
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (paused) return

    let frameId = 0
    let previousTime: number | null = null
    const animate = (time: number) => {
      const track = trackRef.current
      const sequenceWidth = sequenceWidthRef.current
      if (track && sequenceWidth > 0 && previousTime !== null) {
        const speed = sequenceWidth / durationSeconds
        const nextX = xRef.current - speed * ((time - previousTime) / 1000)
        xRef.current = nextX <= -sequenceWidth ? nextX + sequenceWidth : nextX
        track.style.transform = `translate3d(${xRef.current}px, 0, 0)`
      }
      previousTime = time
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [durationSeconds, paused])

  const setHover = (next: boolean) => {
    setHovered(next)
    onHoverChange?.(next)
  }

  return (
    <div
      ref={viewportRef}
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
      <div
        ref={trackRef}
        className={cn("flex w-max items-start", leadPadClassName)}
        style={{ transform: "translate3d(0px, 0, 0)", willChange: paused ? "auto" : "transform" }}
      >
        <div ref={sequenceRef} className={cn("flex shrink-0 items-start pr-3", gapClassName)}>
          {renderSequence(true)}
        </div>
        <div
          aria-hidden="true"
          inert
          className={cn("flex shrink-0 items-start pr-3", gapClassName, "[&_*]:pointer-events-none")}
        >
          {renderSequence(false)}
        </div>
      </div>
    </div>
  )
}
