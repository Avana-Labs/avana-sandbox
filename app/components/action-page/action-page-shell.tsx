"use client"

import { X } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ActionPageMode } from "@/app/lib/action-system/contracts"

type ActionPageShellProps = {
  mode?: ActionPageMode
  title: string
  subtitle?: string
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
  hideTitle = false,
  onClose,
  closeHref,
  children,
  footer,
  className,
}: ActionPageShellProps) {
  const router = useRouter()
  const showChrome = true
  const showTitleBlock = showChrome && !hideTitle

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
      {showChrome ? (
        <div className="flex items-center justify-end px-4 pb-1 pt-3 sm:px-6">
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className={cn("mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6")}>
        {showTitleBlock ? (
          <div className="pb-5">
            <h1 className="text-[1.375rem] font-medium tracking-[-0.03em] sm:text-[1.5rem]">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-[14px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-3">{children}</div>

        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  )
}
