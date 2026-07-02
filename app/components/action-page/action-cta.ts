import { cn } from "@/lib/utils"

/**
 * Canonical action CTAs — one Uniswap-style treatment shared by every
 * lend / borrow / multiply / express surface. Change the look in ONE place.
 *
 * Primary  enabled : solid brand (cyan) fill + white text.
 * Primary  disabled: soft brand tint + legible brand text (Uniswap's tinted
 *                    "Connect" state) — no low-contrast teal-on-teal.
 * Secondary        : outlined surface button, matched height/radius.
 *
 * Sizes:
 *   "default" (h-14) — the final confirm/submit button inside an action flow.
 *   "compact" (h-12) — slimmer, for sticky detail-page action bars.
 */
type CtaSize = "default" | "compact"

const SIZE_CLASS: Record<CtaSize, string> = {
  default: "h-14 text-[16px]",
  compact: "h-12 text-[15px]",
}

const PRIMARY_BASE =
  "flex w-full items-center justify-center rounded-radius-xl px-4 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"

const SECONDARY_BASE =
  "flex w-full items-center justify-center rounded-radius-xl border border-border bg-surface-raised px-4 font-medium text-foreground transition-colors hover:bg-surface-hover"

export function primaryCtaClass(
  opts: { disabled?: boolean; pending?: boolean; size?: CtaSize; className?: string } = {},
): string {
  const { disabled, pending, size = "default", className } = opts
  return cn(
    PRIMARY_BASE,
    SIZE_CLASS[size],
    disabled
      ? "bg-brand-soft text-brand-soft-foreground"
      : "bg-brand text-brand-foreground hover:bg-brand/90 active:bg-brand/80",
    pending && "opacity-80",
    className,
  )
}

export function secondaryCtaClass(opts: { size?: CtaSize; className?: string } = {}): string {
  const { size = "default", className } = opts
  return cn(SECONDARY_BASE, SIZE_CLASS[size], className)
}

/** Default-size secondary CTA class string (used by the in-flow ActionFooter). */
export const SECONDARY_CTA_CLASS = secondaryCtaClass()
