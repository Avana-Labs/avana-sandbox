import type React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { HomeCollateralPool } from "@/app/lib/home-sim"

export function PickerSurface({
  label,
  children,
  footer,
  tier = "top",
  seamless = false,
}: {
  label: string
  children: React.ReactNode
  footer?: React.ReactNode
  tier?: "top" | "bottom"
  /**
   * When true the surface drops its own border so it can sit inside a parent
   * shell (Uniswap-style swap panel). The parent is expected to draw the
   * outer rounded border.
   */
  seamless?: boolean
}) {
  if (seamless) {
    return (
      <div
        className={cn(
          "rounded-2xl px-4 py-[18px] transition-colors",
          tier === "top" ? "bg-card" : "bg-muted/40",
        )}
      >
        <div className="mb-1 text-[13px] font-medium text-muted-foreground">{label}</div>
        {children}
        {footer ? <div className="mt-3 text-xs text-muted-foreground">{footer}</div> : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-[20px] border px-4 py-[18px] transition-colors",
        tier === "top" ? "border-border/70 bg-card" : "border-border/60 bg-muted/40",
      )}
    >
      <div className="mb-1 text-[13px] font-medium text-muted-foreground">{label}</div>
      {children}
      {footer ? <div className="mt-3 text-xs text-muted-foreground">{footer}</div> : null}
    </div>
  )
}

export function PrimaryCardButton({
  disabled,
  children,
  onClick,
}: {
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "mt-1 h-[52px] w-full rounded-[20px] text-[19px] font-semibold shadow-none transition-colors",
        disabled ? "bg-brand-soft text-brand-soft-foreground opacity-100 hover:bg-brand-soft" : "bg-brand text-white hover:bg-brand/90",
      )}
    >
      {children}
    </Button>
  )
}

export function computeHealthFactor(pool: HomeCollateralPool, debtUsd: number): number {
  if (debtUsd <= 0) return Number.POSITIVE_INFINITY
  return (pool.collateralUsd * (pool.maxLtv / 100)) / debtUsd
}
