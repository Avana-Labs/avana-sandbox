"use client"

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from "react"
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
const STEP_MS = 420
const carouselPhaseByKey = new Map<string, number>()

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

/**
 * Infinite auto-scrolling marquee shared by the highlight rows. The caller
 * supplies `renderSequence(interactive)`, which is drawn twice — once live and
 * once aria-hidden — so the loop is seamless. The marquee pauses while hovered
 * and whenever the viewer prefers reduced motion. `onHoverChange` lets callers
 * that layer their own hover UI (e.g. the Lend graph tooltip) reset it on exit.
 */
export type HighlightCarouselHandle = {
  step: (direction: -1 | 1) => void
}

type HighlightCarouselProps = {
  renderSequence: (interactive: boolean) => ReactNode
  className?: string
  gapClassName?: string
  leadPadClassName?: string
  durationSeconds?: number
  onHoverChange?: (hovered: boolean) => void
  syncKey?: string
}

export const HighlightCarousel = forwardRef<HighlightCarouselHandle, HighlightCarouselProps>(function HighlightCarousel(
  {
    renderSequence,
    className,
    gapClassName = "gap-3",
    leadPadClassName = "pl-4 sm:pl-6",
    durationSeconds = DEFAULT_MARQUEE_DURATION_SECONDS,
    onHoverChange,
    syncKey,
  },
  ref,
) {
  const [hovered, setHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const sequenceRef = useRef<HTMLDivElement | null>(null)
  const sequenceWidthRef = useRef(0)
  const xRef = useRef(0)
  const steppingRef = useRef(false)
  const stepFromXRef = useRef(0)
  const stepToXRef = useRef(0)
  const stepStartTimeRef = useRef<number | null>(null)
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const paused = hovered || reduceMotion || !isVisible

  useLayoutEffect(() => {
    const sequence = sequenceRef.current
    const track = trackRef.current
    if (!sequence || !track) return

    let initialized = false
    const updateWidth = () => {
      const nextWidth = sequence.offsetWidth
      sequenceWidthRef.current = nextWidth

      if (!initialized && nextWidth > 0) {
        // Product providers can replace this carousel several times during the
        // first hydration pass. Seed every replacement from the last rendered
        // phase, rather than x=0, so the track never snaps between mounts.
        const phase = syncKey ? (carouselPhaseByKey.get(syncKey) ?? 0) : 0
        xRef.current = -nextWidth * phase
        track.style.transform = `translate3d(${xRef.current}px, 0, 0)`
        initialized = true
      }
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(sequence)
    return () => observer.disconnect()
  }, [durationSeconds, syncKey])

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
      if (track && sequenceWidth > 0) {
        if (steppingRef.current) {
          if (stepStartTimeRef.current == null) stepStartTimeRef.current = time
          const t = Math.min(1, (time - stepStartTimeRef.current) / STEP_MS)
          xRef.current = stepFromXRef.current + (stepToXRef.current - stepFromXRef.current) * easeOutCubic(t)
          track.style.transform = `translate3d(${xRef.current}px, 0, 0)`
          if (t >= 1) {
            steppingRef.current = false
            stepStartTimeRef.current = null
          }
          previousTime = time
        } else if (previousTime !== null) {
          const speed = sequenceWidth / durationSeconds
          // Clamp the frame delta. During load/hydration rAF frames get starved, so
          // an unclamped `time - previousTime` can be hundreds of ms → the track
          // lurches a big distance in one frame (the "shake"), and repeated stalls
          // read as "stop, jump, restart". Capping dt keeps motion continuous no
          // matter how delayed a frame is.
          const dt = Math.min((time - previousTime) / 1000, 0.05)
          let nextX = xRef.current - speed * dt
          // Seamless wrap (while-loop in case a clamp still lands past one sequence).
          while (nextX <= -sequenceWidth) nextX += sequenceWidth
          xRef.current = nextX
          if (syncKey) carouselPhaseByKey.set(syncKey, Math.max(0, Math.min(1, -nextX / sequenceWidth)))
          track.style.transform = `translate3d(${xRef.current}px, 0, 0)`
          previousTime = time
        } else {
          // First frame after (re)start: seed the clock without moving, so resuming
          // from a pause continues from the same position instead of jumping.
          previousTime = time
        }
      } else {
        previousTime = time
      }
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [durationSeconds, paused, syncKey])

  const setHover = (next: boolean) => {
    setHovered(next)
    onHoverChange?.(next)
  }

  useImperativeHandle(
    ref,
    () => ({
      step(direction) {
        const sequence = sequenceRef.current
        const track = trackRef.current
        const card = sequence?.firstElementChild as HTMLElement | null
        if (!sequence || !track || !card) return

        const gap =
          Number.parseFloat(getComputedStyle(sequence).columnGap || getComputedStyle(sequence).gap || "12") || 12
        const cardStep = card.getBoundingClientRect().width + gap
        const sequenceWidth = sequenceWidthRef.current
        const fromX = xRef.current
        let nextX = fromX - direction * cardStep
        if (sequenceWidth > 0) {
          while (nextX <= -sequenceWidth) nextX += sequenceWidth
          while (nextX > 0) nextX -= sequenceWidth
        }

        // Loop wrap would animate the whole track the wrong way — keep that instant.
        if (reduceMotion || Math.abs(nextX - fromX) > cardStep * 1.5) {
          steppingRef.current = false
          stepStartTimeRef.current = null
          xRef.current = nextX
          if (syncKey && sequenceWidth > 0) {
            carouselPhaseByKey.set(syncKey, Math.max(0, Math.min(1, -nextX / sequenceWidth)))
          }
          track.style.transform = `translate3d(${nextX}px, 0, 0)`
          return
        }

        stepFromXRef.current = fromX
        stepToXRef.current = nextX
        stepStartTimeRef.current = null
        steppingRef.current = true
      },
    }),
    [reduceMotion, syncKey],
  )

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
})
