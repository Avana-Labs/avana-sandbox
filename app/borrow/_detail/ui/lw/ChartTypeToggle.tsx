"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { LwChartType } from "./LightweightChart"

type ChartTypeToggleProps = {
  value: Extract<LwChartType, "area" | "bar">
  onChange: (value: Extract<LwChartType, "area" | "bar">) => void
  className?: string
}

/**
 * Uniswap-style two-icon segmented control (line / bar) used above charts that
 * make sense either as a smoothed trend or as discrete buckets (volume, fees).
 */
export function ChartTypeToggle({ value, onChange, className }: ChartTypeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Chart type"
      className={cn("inline-flex items-center rounded-full border border-border/60 bg-background p-0.5", className)}
    >
      <Btn active={value === "area"} onClick={() => onChange("area")} label="Line">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M1 10 L5 6 L8 9 L13 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Btn>
      <Btn active={value === "bar"} onClick={() => onChange("bar")} label="Bars">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <rect x="2" y="6" width="2.2" height="6" rx="0.5" fill="currentColor" />
          <rect x="6" y="3" width="2.2" height="9" rx="0.5" fill="currentColor" />
          <rect x="10" y="8" width="2.2" height="4" rx="0.5" fill="currentColor" />
        </svg>
      </Btn>
    </div>
  )
}

function Btn({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 w-7 items-center justify-center rounded-full transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
