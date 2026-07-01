"use client"

import { X } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ActionPageMode } from "@/app/lib/action-system/contracts"
import { LanguageSwitcher } from "@/app/components/language-switcher"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type ActionPageShellProps = {
  mode?: ActionPageMode
  density?: "default" | "sidebar" | "home"
  title: string
  subtitle?: string
  simulated?: boolean
  hideTitle?: boolean
  hideClose?: boolean
  onClose?: () => void
  closeHref?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function ActionPageShell({
  mode = "page",
  density = "default",
  title,
  subtitle,
  hideTitle = false,
  hideClose = false,
  onClose,
  closeHref,
  children,
  footer,
  className,
}: ActionPageShellProps) {
  const router = useRouter()
  const { t } = useTranslation()
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
        mode === "embedded" && density === "sidebar" && "rounded-none border-0 bg-transparent shadow-none",
        mode === "embedded" && density === "home" && "rounded-none border-0 bg-transparent shadow-none",
        mode === "embedded" && density === "default" && "rounded-radius-md",
        className,
      )}
      data-testid="action-page-shell"
      data-mode={mode}
    >
      {showChrome && (!hideClose || mode !== "embedded") ? (
        <div className="flex items-center justify-end gap-1.5 px-4 pb-1 pt-3 sm:px-6">
          {mode !== "embedded" ? <LanguageSwitcher /> : null}
          {!hideClose ? (
            <button
              type="button"
              aria-label="Close"
              onClick={handleClose}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col",
          density === "home" ? "max-w-none gap-2 px-0 pb-0" : "max-w-[560px] gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6",
          mode === "embedded" && density === "sidebar" && "gap-4 py-5",
        )}
      >
        {showTitleBlock ? (
          <div className="pb-5">
            <h1 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[1.625rem]">{t(title)}</h1>
            {subtitle ? <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{t(subtitle)}</p> : null}
          </div>
        ) : null}

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            mode === "embedded" && density === "sidebar" ? "gap-4" : "gap-4",
            mode === "embedded" && density === "home" && "gap-2",
          )}
        >
          {children}
        </div>

        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  )
}
