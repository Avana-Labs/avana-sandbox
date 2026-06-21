"use client"

import Link from "next/link"
import { LoaderCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActionBlockedUi } from "@/app/lib/action-system/contracts"

export function ActionBlockedDialog({
  blocked,
  open,
  onClose,
  onPrimary,
}: {
  blocked: ActionBlockedUi
  open: boolean
  onClose: () => void
  onPrimary?: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" data-testid="action-blocked-dialog">
      <div className="relative w-full max-w-[420px] rounded-[24px] border border-border bg-surface-raised p-6 shadow-elev-3">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="space-y-3 pt-2">
          <h2 className="pr-8 text-[20px] font-medium tracking-[-0.02em]">{blocked.title}</h2>
          <p className="text-[14px] leading-6 text-muted-foreground">{blocked.description}</p>
        </div>

        <div className="mt-6 space-y-3">
          {blocked.primaryCtaLabel && blocked.primaryCtaHref ? (
            <Link
              href={blocked.primaryCtaHref}
              onClick={onPrimary}
              className="flex h-12 w-full items-center justify-center rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90"
            >
              {blocked.primaryCtaLabel}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex h-12 w-full items-center justify-center rounded-full border border-border bg-surface-raised text-[15px] font-medium text-foreground transition-colors hover:bg-muted",
              !blocked.primaryCtaLabel && "bg-foreground text-background hover:opacity-90",
            )}
          >
            {blocked.secondaryCtaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
