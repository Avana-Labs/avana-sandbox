"use client"

import { ArrowUpRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { HomeSuccessState } from "./types"

export function ActionSuccessDialog({
  state,
  onClose,
}: {
  state: HomeSuccessState | null
  onClose: () => void
}) {
  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden rounded-radius-md border border-border bg-surface-raised p-0 shadow-elev-3 sm:max-w-[420px]">
        {state ? (
          <>
            <DialogHeader className="space-y-0 border-b border-border px-5 pb-4 pt-5 text-left">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-xs border border-border bg-surface-inset">
                  <Check className="h-4 w-4 text-accent-emphasis" strokeWidth={2.25} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <DialogTitle className="text-[14px] font-medium text-foreground">
                    {state.title}
                  </DialogTitle>
                  <DialogDescription className="text-[12px] text-muted-foreground">
                    {state.description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Amount
                </span>
                <span className="font-data text-[22px] font-medium tracking-tight text-foreground">
                  {state.amount}
                </span>
              </div>

              {state.rows.length > 0 ? (
                <div className="divide-y divide-border overflow-hidden rounded-radius-sm border border-border bg-surface-inset">
                  {state.rows.map((row, index) => (
                    <div
                      key={`${row.label}-${index}`}
                      className="flex items-center justify-between gap-4 px-3.5 py-2.5"
                    >
                      <span className="text-[11.5px] text-muted-foreground">{row.label}</span>
                      <span
                        className={cn(
                          "font-data text-[12.5px] font-medium tabular-nums",
                          (!row.tone || row.tone === "default") && "text-foreground",
                          row.tone === "positive" && "text-emerald-700 dark:text-emerald-400",
                          row.tone === "warning" && "text-amber-700 dark:text-amber-400",
                          row.tone === "danger" && "text-rose-700 dark:text-rose-400",
                        )}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <DialogFooter className="flex-col gap-2 border-t border-border px-5 py-3 sm:flex-col sm:space-x-0">
              <Button
                type="button"
                className="h-10 w-full rounded-radius-sm bg-accent-primary text-[13px] font-medium text-accent-primary-foreground shadow-elev-1 transition-colors hover:bg-accent-primary-hover"
                onClick={onClose}
              >
                Done
              </Button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                View transaction
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
