import { cn } from '@/lib/utils'

/**
 * Skeleton placeholder. A soft, theme-adaptive shimmer sweeps across a gently
 * breathing base so loading states read as premium rather than as raw gray
 * blocks. The shimmer band is tuned per theme (a clean light sweep in light
 * mode, a faint luminous sweep in dark mode) and respects reduced-motion.
 *
 * Decorative by default (`aria-hidden`): a single loading region (e.g. the page
 * skeleton's `role="status"` container) should announce "Loading" once, rather
 * than a screen reader crawling over dozens of empty placeholder blocks. Pass
 * `aria-hidden={false}` to opt a specific placeholder back in.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/70",
        "motion-safe:animate-[skeleton-pulse_2.4s_ease-in-out_infinite]",
        "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/55 before:to-transparent before:content-['']",
        "motion-safe:before:animate-[loading-shimmer_1.9s_cubic-bezier(0.4,0,0.2,1)_infinite]",
        "dark:before:via-white/[0.07]",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Multi-line text placeholder. Follows the classic skeleton-screen pattern
 * (Marina Aisa, "Design and code skeleton screens"): several full-width lines
 * where the last is short and the lines fade toward the background, so the block
 * reads as a paragraph of unknown length trailing off — not a solid rectangle.
 *
 * The fade lives on a wrapper element, not the Skeleton itself, because the base
 * `skeleton-pulse` animation drives `opacity` and would otherwise override an
 * inline value. Line widths/opacities are index-derived (deterministic) so the
 * server and client render identically.
 */
function SkeletonText({
  lines = 3,
  className,
  lineClassName,
  lastLineWidth = "62%",
}: {
  lines?: number
  className?: string
  lineClassName?: string
  /** Width of the trailing line (CSS length). Suggests text ending mid-line. */
  lastLineWidth?: string
}) {
  const denominator = Math.max(1, lines - 1)
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1
        // 1 → ~0.45 across the block: later lines "merge into the background".
        const fade = 1 - (index / denominator) * 0.55
        return (
          <div key={index} style={{ opacity: fade }}>
            <Skeleton
              className={cn("h-3 rounded-xs", isLast ? undefined : "w-full", lineClassName)}
              style={isLast ? { width: lastLineWidth } : undefined}
            />
          </div>
        )
      })}
    </div>
  )
}

export { Skeleton, SkeletonText }
