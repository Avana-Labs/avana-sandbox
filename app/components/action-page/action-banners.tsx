"use client"

import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActionRiskLevel } from "@/app/lib/action-system/contracts"

export function ActionRiskBanner({
  level,
  title,
  message,
  className,
}: {
  level: ActionRiskLevel
  title: string
  message: string
  className?: string
}) {
  return (
    <div
      data-testid="action-risk-banner"
      className={cn(
        "flex gap-3 rounded-[18px] border px-4 py-3",
        level === "danger" && "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-100",
        level === "warning" && "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
        level === "safe" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
        className,
      )}
    >
      <AlertTriangle
        className={cn(
          "mt-0.5 size-4 shrink-0",
          level === "danger" && "text-rose-600 dark:text-rose-300",
          level === "warning" && "text-amber-600 dark:text-amber-300",
          level === "safe" && "text-emerald-600 dark:text-emerald-300",
        )}
      />
      <div>
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="mt-1 text-[13px] leading-relaxed opacity-90">{message}</div>
      </div>
    </div>
  )
}

export function ActionOutcomeBanner({
  tone,
  title,
  message,
}: {
  tone: "error" | "success"
  title: string
  message: string
}) {
  return (
    <div
      data-testid="action-outcome-banner"
      className={cn(
        "flex gap-3 rounded-[18px] border px-4 py-3",
        tone === "error" && "border-rose-500/30 bg-rose-500/10",
        tone === "success" && "border-emerald-500/30 bg-emerald-500/10",
      )}
    >
      <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", tone === "error" ? "text-rose-500" : "text-emerald-500")} />
      <div>
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="mt-1 text-[13px] text-muted-foreground">{message}</div>
      </div>
    </div>
  )
}

export function ActionWalletToast({ message }: { message: string }) {
  return (
    <div
      data-testid="action-wallet-toast"
      className="fixed bottom-6 left-1/2 z-[60] w-[min(calc(100vw-2rem),420px)] -translate-x-1/2 rounded-full border border-border bg-surface-raised px-4 py-3 text-center text-[13px] shadow-elev-3"
    >
      {message}
    </div>
  )
}
