import { cn } from "@/lib/utils"

/**
 * Canonical primary action CTA — one Uniswap-style treatment used by every
 * lend / borrow / multiply / express action surface.
 *
 * Enabled  : solid brand (cyan) fill + white text.
 * Disabled : soft brand tint + legible brand text (the designed `brand-soft`
 *            pair), matching Uniswap's tinted "Connect" state. No low-contrast
 *            teal-on-teal, no ad-hoc border.
 *
 * Change the button look in ONE place here — never re-hardcode CTA classes.
 */
const PRIMARY_CTA_BASE =
  "flex h-14 w-full items-center justify-center rounded-[20px] px-4 text-[16px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"

export function primaryCtaClass(
  opts: { disabled?: boolean; pending?: boolean; className?: string } = {},
): string {
  const { disabled, pending, className } = opts
  return cn(
    PRIMARY_CTA_BASE,
    disabled
      ? "bg-brand-soft text-brand-soft-foreground"
      : "bg-brand text-brand-foreground hover:bg-brand/90 active:bg-brand/80",
    pending && "opacity-80",
    className,
  )
}

/** Canonical secondary action CTA (e.g. Cancel / Back), matched to the primary height & radius. */
export const SECONDARY_CTA_CLASS =
  "flex h-14 items-center justify-center rounded-[20px] border border-border bg-surface-raised px-4 text-[16px] font-medium text-foreground transition-colors hover:bg-surface-hover"
