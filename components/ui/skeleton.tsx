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
        // A slim bright streak (≈30% of the width) sweeps across. Tuned per theme:
        // a clean light sweep in light mode, a luminous-but-restrained one in dark.
        "before:absolute before:inset-0 before:-translate-x-full before:content-['']",
        "before:bg-[linear-gradient(100deg,transparent_35%,rgba(255,255,255,0.6)_50%,transparent_65%)]",
        "dark:before:bg-[linear-gradient(100deg,transparent_35%,rgba(255,255,255,0.14)_50%,transparent_65%)]",
        "motion-safe:before:animate-[loading-shimmer_2s_cubic-bezier(0.4,0,0.2,1)_infinite]",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
