"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { ActionBlockedUi } from "@/app/lib/action-system/contracts"

export function ActionBlockedDialog({
  open,
  blocked,
  onClose,
  onPrimary,
}: {
  open: boolean
  blocked: ActionBlockedUi
  onClose: () => void
  onPrimary?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-w-md rounded-[24px] border border-border bg-surface-raised p-6">
        <DialogTitle className="text-[18px] font-medium">{blocked.title}</DialogTitle>
        <p className="mt-3 text-[14px] leading-6 text-muted-foreground">{blocked.description}</p>
        <div className="mt-6 flex flex-col gap-2">
          {blocked.primaryCtaLabel ? (
            <Button className="h-11 rounded-full" onClick={onPrimary}>
              {blocked.primaryCtaLabel}
            </Button>
          ) : null}
          <Button variant="secondary" className="h-11 rounded-full" onClick={onClose}>
            {blocked.secondaryCtaLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
