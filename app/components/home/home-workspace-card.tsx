"use client"

import type { ReactNode } from "react"
import { Settings } from "lucide-react"
import type { HomeMode } from "@/app/lib/home-sim"
import { ActionWorkspaceTabs } from "@/app/components/action-page/action-workspace-tabs"

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
    <section className="flex min-h-[calc(100dvh-4rem)] justify-center px-4 pb-12 pt-8 md:pb-16 md:pt-14">
      <div className="w-full max-w-[480px]" data-testid="home-workspace-card">
        <div className="flex items-center justify-between gap-2">
          <ActionWorkspaceTabs
            items={HOME_MODE_ITEMS.map((item) => ({ id: item.value, label: item.label }))}
            value={mode}
            onChange={(value) => onModeChange(value as HomeMode)}
            ariaLabel="Borrow actions"
          />
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
