import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Add the sweeping shimmer band on top of the base pulse. Off by default: the
   * shimmer spins up an extra always-animating compositing layer per element, so
   * a loading view with dozens of placeholders would run dozens of them at once.
   * Reserve it for a few large "hero" placeholders where the effect reads; the
   * cheap opacity pulse already signals loading for the rest.
   */
  shimmer?: boolean
}

/**
 * Skeleton placeholder. A gently breathing base signals loading without raw gray
 * blocks; the base pulse animates opacity only (compositor-cheap). Opt in to
 * `shimmer` for a soft, theme-adaptive sweep on a standout placeholder. Both
 * respect reduced-motion.
 *
 * Decorative by default (`aria-hidden`): a single loading region (e.g. the page
 * skeleton's `role="status"` container) should announce "Loading" once, rather
 * than a screen reader crawling over dozens of empty placeholder blocks. Pass
 * `aria-hidden={false}` to opt a specific placeholder back in.
 */
function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/70",
        "motion-safe:animate-[skeleton-pulse_2.4s_ease-in-out_infinite]",
        // A slim bright streak (≈30% of the width) sweeps across. Tuned per theme:
        // a clean light sweep in light mode, a luminous-but-restrained one in dark.
        shimmer && [
          "before:absolute before:inset-0 before:-translate-x-full before:content-['']",
          "before:bg-[linear-gradient(100deg,transparent_35%,rgba(255,255,255,0.6)_50%,transparent_65%)]",
          "dark:before:bg-[linear-gradient(100deg,transparent_35%,rgba(255,255,255,0.14)_50%,transparent_65%)]",
          "motion-safe:before:animate-[loading-shimmer_2s_cubic-bezier(0.4,0,0.2,1)_infinite]",
        ],
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
