"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { RiskBreakdownItem } from "@/app/lib/borrow-detail"
import { formatBpsAsPct } from "@/app/lib/borrow-detail"
import { RiskLevelPill } from "./RiskLevelPill"

type RiskBreakdownAccordionProps = {
  items: RiskBreakdownItem[]
  className?: string
  /** Pre-expand every row when true (useful for print / export). */
  defaultAllOpen?: boolean
}

export function RiskBreakdownAccordion({ items, className, defaultAllOpen = false }: RiskBreakdownAccordionProps) {
  const [open, setOpen] = React.useState<Set<string>>(
    () => new Set(defaultAllOpen ? items.map((i) => i.id) : []),
  )
  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <ul className={cn("flex flex-col divide-y divide-border/60 rounded-xl border border-border bg-background", className)}>
      {items.map((item) => {
        const isOpen = open.has(item.id)
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              aria-controls={`risk-${item.id}`}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="truncate text-sm font-semibold text-foreground">{item.label}</span>
                <RiskLevelPill level={item.level} withDot={false} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-data text-sm font-semibold tabular-nums text-foreground">
                  {formatBpsAsPct(item.bps)}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  aria-hidden
                  className={cn("transition-transform text-muted-foreground", isOpen ? "rotate-180" : "")}
                >
                  <path d="M3 5 L7 9 L11 5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>
            {isOpen ? (
              <div id={`risk-${item.id}`} className="px-4 pb-4 pt-0 text-xs leading-5 text-muted-foreground">
                {item.description}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
