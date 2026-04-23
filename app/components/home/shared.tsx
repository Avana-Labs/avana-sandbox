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
   * shell. The parent is expected to draw the outer container.
   */
  seamless?: boolean
}) {
  if (seamless) {
    return (
      <div
        className={cn(
          "px-4 py-4 transition-colors",
          tier === "top" ? "bg-surface-raised" : "bg-surface-inset",
        )}
      >
        <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </div>
        {children}
        {footer ? <div className="mt-3 text-[11.5px] text-muted-foreground">{footer}</div> : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-radius-sm border border-border px-4 py-4 transition-colors",
        tier === "top" ? "bg-surface-raised" : "bg-surface-inset",
      )}
    >
      <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </div>
      {children}
      {footer ? <div className="mt-3 text-[11.5px] text-muted-foreground">{footer}</div> : null}
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
        "mt-1 h-10 w-full rounded-radius-sm text-[13px] font-medium transition-colors shadow-elev-1",
        disabled
          ? "bg-muted text-muted-foreground hover:bg-muted"
          : "bg-accent-primary text-accent-primary-foreground hover:bg-accent-primary-hover",
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
