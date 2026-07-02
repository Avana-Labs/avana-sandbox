"use client"

import Link from "next/link"
import { X } from "lucide-react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { Button } from "@/components/ui/button"
import type { ActionBlockedUi } from "@/app/lib/action-system/contracts"

export function ActionBlockedDialog({
  blocked,
  open,
  onClose,
  onPrimary,
  variant = "modal",
}: {
  blocked: ActionBlockedUi
  open: boolean
  onClose: () => void
  onPrimary?: () => void
  variant?: "modal" | "inline"
}) {
  const { t } = useTranslation()
  if (!open) return null

  // One shared pill treatment (full-width Button) for both the inline and modal
  // variants; only the height differs.
  const pill = variant === "inline" ? "h-11 w-full rounded-full text-[15px] font-medium" : "h-12 w-full rounded-full text-[15px] font-medium"

  const actions = (
    <>
      {blocked.primaryCtaLabel && blocked.primaryCtaHref ? (
        <Button asChild className={pill}>
          <Link href={blocked.primaryCtaHref} onClick={onPrimary}>
            {t(blocked.primaryCtaLabel)}
          </Link>
        </Button>
      ) : null}
      <Button
        type="button"
        variant={blocked.primaryCtaLabel ? "secondary" : "default"}
        onClick={onClose}
        className={pill}
      >
        {t(blocked.secondaryCtaLabel)}
      </Button>
    </>
  )

  if (variant === "inline") {
    return (
      <div
        className="rounded-radius-md border border-border bg-card p-5"
        data-testid="action-blocked-dialog"
        data-variant="inline"
      >
        <div className="space-y-2">
          <h2 className="text-[17px] font-medium tracking-[-0.02em]">{t(blocked.title)}</h2>
          <p className="text-[14px] leading-6 text-muted-foreground">{t(blocked.description)}</p>
        </div>

        <div className="mt-5 space-y-2.5">{actions}</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 backdrop-blur-xl" data-testid="action-blocked-dialog" data-variant="modal">
      <div className="relative w-full max-w-[420px] rounded-radius-lg border-0 bg-card p-6 shadow-elev-2">
        <button
          type="button"
          aria-label={t("Close")}
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="space-y-3 pt-2">
          <h2 className="pr-8 text-[20px] font-medium tracking-[-0.02em]">{t(blocked.title)}</h2>
          <p className="text-[14px] leading-6 text-muted-foreground">{t(blocked.description)}</p>
        </div>

        <div className="mt-6 space-y-3">{actions}</div>
      </div>
    </div>
  )
}
