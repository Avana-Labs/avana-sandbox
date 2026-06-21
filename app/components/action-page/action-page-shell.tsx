"use client"

import { ArrowLeft, HelpCircle, X } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ActionPageMode } from "@/app/lib/action-system/contracts"

type ActionPageShellProps = {
  mode?: ActionPageMode
  title: string
  subtitle: string
  walletLabel?: string
  simulated?: boolean
  onClose?: () => void
  closeHref?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function ActionPageShell({
  mode = "page",
  title,
  subtitle,
  walletLabel,
  simulated = false,
  onClose,
  closeHref,
  children,
  footer,
  className,
}: ActionPageShellProps) {
  const showChrome = mode !== "embedded"

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col bg-background text-foreground",
        mode === "page" && "min-h-[100dvh]",
        mode === "overlay" && "fixed inset-0 z-50 min-h-[100dvh]",
        className,
      )}
      data-testid="action-page-shell"
      data-mode={mode}
    >
      {showChrome ? (
        <header className="flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6">
          {closeHref ? (
            <Link
              href={closeHref}
              aria-label="Close"
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </Link>
          ) : (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}

          {walletLabel ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[12px] font-medium">
              <span className="size-5 rounded-full bg-gradient-to-br from-pink-400 via-violet-400 to-indigo-500" aria-hidden />
              <span className="font-data tabular-nums">{walletLabel}</span>
            </div>
          ) : (
            <div className="size-9" aria-hidden />
          )}
        </header>
      ) : null}

      <div className={cn("mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6", !showChrome && "pt-2")}>
        <div className="pb-6 pt-2">
          <h1 className="text-[clamp(2rem,6vw,2.75rem)] font-medium tracking-[-0.04em]">{title}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>
          {simulated ? (
            <span className="mt-3 inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
              Simulated transaction
            </span>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4">{children}</div>

        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>

      {showChrome ? (
        <div className="pointer-events-none fixed bottom-4 right-4 hidden sm:block">
          <span className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur">
            <HelpCircle className="size-4" />
          </span>
        </div>
      ) : null}
    </div>
  )
}

export function ActionPageBackButton({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={onClick}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="size-4" />
    </button>
  )
}
