"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Check } from "lucide-react"
import { Dialog, DialogClose, DialogTitle } from "@/components/ui/dialog"
import { PillButton } from "./atoms"

export type SuccessRow = { label: string; value: string; tone?: string }

export type SuccessOverlayProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  amountLabel: string
  ringEmoji?: string
  ringBgClass?: string
  rows: SuccessRow[]
  primaryLabel?: string
  onPrimary?: () => void
}

export function SuccessOverlay({
  open,
  onClose,
  title,
  subtitle,
  amountLabel,
  rows,
  primaryLabel = "Done",
  onPrimary,
}: SuccessOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-radius-md border border-border bg-surface-raised p-0 shadow-elev-3 duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="border-b border-border px-5 pb-4 pt-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xs border border-border bg-surface-inset text-accent-emphasis">
                <Check className="size-4" strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-[14px] font-medium text-foreground">{title}</DialogTitle>
                {subtitle ? <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p> : null}
              </div>
            </div>
            <div className="mt-4 font-data text-[22px] font-medium tabular-nums text-foreground">{amountLabel}</div>
          </div>

          <div className="px-5 py-4">
            <dl className="divide-y divide-border overflow-hidden rounded-radius-sm border border-border bg-surface-inset">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-3 py-2 text-[12.5px]">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className={row.tone ? `font-data font-medium tabular-nums ${row.tone}` : "font-data font-medium tabular-nums text-foreground"}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <PillButton variant="ghost" size="sm" onClick={onClose}>
              Close
            </PillButton>
            <PillButton
              variant="primary"
              size="sm"
              onClick={() => {
                onPrimary?.()
                onClose()
              }}
            >
              {primaryLabel}
            </PillButton>
          </div>

          <DialogClose className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground">
            <span className="sr-only">Close</span>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  )
}
