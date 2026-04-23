"use client"

import { useEffect } from "react"
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
  useEffect(() => {
    if (!state) {
      return
    }

    import("canvas-confetti")
      .then((confetti) => {
        confetti.default({
          particleCount: 110,
          spread: 70,
          origin: { y: 0.65 },
          colors: ["#FC2672", "#18C964", "#F5A623", "#006FEE", "#7928CA", "#F31260"],
        })
      })
      .catch(() => undefined)
  }, [state])

  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden rounded-[24px] border border-border/40 bg-card p-0 shadow-xl sm:max-w-[440px]">
        {state ? (
          <>
            <DialogHeader className="items-center gap-3 px-6 pb-2 pt-8 text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-brand-soft text-5xl">{state.emoji}</div>
              <DialogTitle className="mt-2 text-2xl font-semibold tracking-tight">{state.title}</DialogTitle>
              <div className="font-data text-xl font-semibold text-brand">{state.amount}</div>
              <DialogDescription className="max-w-sm text-center text-sm text-muted-foreground">{state.description}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 p-6">
              <div className="rounded-2xl border border-border/40 bg-surface-1">
                <div className="flex flex-col">
                  {state.rows.map((row, index) => (
                    <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span
                        className={cn(
                          "font-data text-sm font-semibold",
                          row.tone === "positive" && "text-emerald-600",
                          row.tone === "warning" && "text-amber-600",
                          row.tone === "danger" && "text-rose-600",
                        )}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 pb-6 pt-2 sm:justify-center">
              <Button type="button" className="h-12 w-full rounded-[20px] bg-brand-soft text-[17px] font-semibold text-brand shadow-none transition-colors hover:bg-brand-soft" onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
