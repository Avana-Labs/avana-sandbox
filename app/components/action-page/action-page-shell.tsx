"use client"

import { HelpCircle, X } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { ActionPageMode } from "@/app/lib/action-system/contracts"

type ActionPageShellProps = {
  mode?: ActionPageMode
  title: string
  subtitle?: string
  walletLabel?: string
  simulated?: boolean
  hideTitle?: boolean
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
  hideTitle = false,
  onClose,
  closeHref,
  children,
  footer,
  className,
}: ActionPageShellProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const showChrome = true
  const showTitleBlock = showChrome && !hideTitle

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClose = () => {
    if (onClose) {
      onClose()
      return
    }
    if (closeHref) {
      router.push(closeHref)
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-col bg-background text-foreground",
        mode === "page" && "min-h-[100dvh]",
        mode === "overlay" && "fixed inset-0 z-50 min-h-[100dvh]",
        className,
      )}
      data-testid="action-page-shell"
      data-mode={mode}
    >
      {showChrome && mounted ? (
        <header className="flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6">
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>

          {walletLabel ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[12px] font-medium">
              <span className="size-5 rounded-full bg-gradient-to-br from-pink-400 via-violet-400 to-indigo-500" aria-hidden />
              <span className="font-data tabular-nums">{walletLabel}</span>
            </div>
          ) : (
            <div className="size-9" aria-hidden />
          )}
        </header>
      ) : showChrome ? (
        <div className="h-[52px] shrink-0" aria-hidden />
      ) : null}

      <div className={cn("mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 pt-1")}>
        {showTitleBlock && mounted ? (
          <div className="pb-5 pt-1">
            <h1 className="text-[1.375rem] font-medium tracking-[-0.03em] sm:text-[1.5rem]">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-[14px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-3">{mounted ? children : null}</div>

        {footer ? <div className="mt-4">{footer}</div> : null}
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
