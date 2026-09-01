import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Deprecated / no-op: the directional "moving train" sweep is now the default for
   * every skeleton (see `.skeleton-sweep` in globals.css). Kept so existing callers
   * that pass `shimmer` still type-check.
   */
  shimmer?: boolean
}

/**
 * Skeleton placeholder. A muted base with a bright band that sweeps left → right
 * (the `.skeleton-sweep` utility) — a directional shimmer rather than a plain
 * opacity fade. The sweep is a compositor-cheap translateX and respects
 * reduced-motion (band drops, base stays).
 *
 * Decorative by default (`aria-hidden`): a single loading region (e.g. the page
 * skeleton's `role="status"` container) announces "Loading" once, rather than a
 * screen reader crawling over dozens of empty placeholder blocks. Pass
 * `aria-hidden={false}` to opt a specific placeholder back in.
 */
function Skeleton({ className, shimmer: _shimmer, ...props }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("skeleton-sweep rounded-md", className)} {...props} />
}

export { Skeleton }
