"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
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
  const reduceMotion = useReducedMotion()

  return (
    <section className="flex min-h-[calc(100dvh-4rem)] justify-center px-4 pb-12 pt-8 md:pb-16 md:pt-14">
      <div className="w-full max-w-[480px]" data-testid="home-workspace-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1" role="tablist" aria-label="Borrow actions">
            {HOME_MODE_ITEMS.map((item) => {
              const active = item.value === mode
              return (
                <motion.button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onModeChange(item.value)}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  whileHover={reduceMotion ? undefined : { y: -1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[16px] font-medium leading-none transition-colors",
                    active
                      ? "bg-[hsl(0,0%,96%)] text-foreground shadow-[0_8px_20px_-14px_hsl(var(--foreground)/0.35)] dark:bg-surface-inset"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </motion.button>
              )
            })}
          </div>
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[hsl(0,0%,96%)] hover:text-foreground dark:hover:bg-surface-inset"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2">{children}</div>
      </div>
    </section>
  )
}
