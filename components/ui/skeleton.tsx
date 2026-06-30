import { cn } from '@/lib/utils'

/**
 * Skeleton placeholder. A soft, theme-adaptive shimmer sweeps across a gently
 * breathing base so loading states read as premium rather than as raw gray
 * blocks. The shimmer band is tuned per theme (a clean light sweep in light
 * mode, a faint luminous sweep in dark mode) and respects reduced-motion.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
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

export { Skeleton }
