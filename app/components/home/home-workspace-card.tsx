"use client"

import type { ReactNode } from "react"
import { Settings } from "lucide-react"
import type { HomeMode } from "@/app/lib/home-sim"
import { cn } from "@/lib/utils"

const HOME_MODE_ITEMS: Array<{ value: HomeMode; label: string }> = [
  { value: "borrow", label: "Borrow" },
  { value: "repay", label: "Repay" },
  { value: "claim", label: "Claim" },
  { value: "remove", label: "Remove" },
]

export function HomeWorkspaceCard({
  mode,
  onModeChange,
  children,
}: {
  mode: HomeMode
  onModeChange: (mode: HomeMode) => void
  children: ReactNode
}) {
  return (
    <section className="flex min-h-[calc(100dvh-5.5rem)] items-center justify-center px-4 py-6 md:py-10">
      <div className="w-full max-w-[480px]" data-testid="home-workspace-card">
        <div className="overflow-hidden rounded-[24px] border border-border bg-card shadow-elev-1">
          <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
            <div className="flex min-w-0 flex-wrap items-center gap-0.5" role="tablist" aria-label="Borrow actions">
              {HOME_MODE_ITEMS.map((item) => {
                const active = item.value === mode
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onModeChange(item.value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[15px] font-medium transition-colors",
                      active
                        ? "bg-surface-inset text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>

          <div className="px-2 pb-3 pt-0 sm:px-3">
            <div className="flex flex-col gap-3">{children}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
