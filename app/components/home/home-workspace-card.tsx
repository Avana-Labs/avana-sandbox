"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { Settings } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { HomeMode } from "@/app/lib/home-sim"
import { ActionWorkspaceTabs } from "@/app/components/action-page/action-workspace-tabs"
import { useTranslation } from "@/app/lib/i18n/use-translation"

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { t } = useTranslation()

  return (
    <section className="flex min-h-[calc(100dvh-4rem)] justify-center px-4 pb-12 pt-8 md:pb-16 md:pt-14">
      <div className="w-full max-w-[480px]" data-testid="home-workspace-card">
        <div className="flex items-center justify-between gap-2">
          <ActionWorkspaceTabs
            items={HOME_MODE_ITEMS.map((item) => ({ id: item.value, label: t(item.label) }))}
            value={mode}
            onChange={(value) => onModeChange(value as HomeMode)}
            ariaLabel={t("Borrow actions")}
          />
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-label={t("Settings")}
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2">{children}</div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-medium tracking-[-0.02em] text-foreground">
              {t("Workspace settings")}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-5 text-muted-foreground">
              {t("This is the sandbox workspace for the selected action mode. Wallet, network, and transaction state are simulated in-app.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-radius-md border border-border bg-surface-inset p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground">{t("Current mode")}</span>
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[12px] font-medium text-brand">
                {t(mode)}
              </span>
            </div>
            <p className="text-[13px] leading-5 text-foreground/80">
              {t("Use the mode tabs to switch between Borrow, Repay, Claim, and Remove. The header Connect button opens the sandbox wallet details.")}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link
              href="/support-center"
              className="inline-flex h-10 items-center justify-center rounded-radius-sm border border-border px-4 text-[14px] font-medium text-foreground transition-colors hover:bg-surface-inset"
            >
              {t("Open support")}
            </Link>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-radius-sm bg-brand px-4 text-[14px] font-medium text-brand-foreground transition-colors hover:bg-brand/90"
              onClick={() => setSettingsOpen(false)}
            >
              {t("Close")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
