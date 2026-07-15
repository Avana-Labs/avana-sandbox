"use client"

import { X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ActionPageMode } from "@/app/lib/action-system/contracts"
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
  simulated = false,
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

  // Full-screen action flows open as their own route (the table/hero "popup" CTAs
  // navigate here), but Next preserves the launching page's window scroll — so the
  // flow would open mid-scroll with its header cut off. Reset to the top on mount.
  // Embedded flows live inside another scroll context, so leave those untouched.
  useEffect(() => {
    if (mode === "page" || mode === "overlay") {
      window.scrollTo(0, 0)
    }
  }, [mode])

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
      {showChrome && !hideClose ? (
        <div className="flex items-center justify-end gap-1.5 px-4 pb-1 pt-3 sm:px-6">
          <button
            type="button"
            aria-label={t("Close")}
            onClick={handleClose}
            className="inline-flex size-11 items-center justify-center rounded-full border border-border/60 bg-surface-2/60 text-muted-foreground shadow-elev-1 backdrop-blur-md transition-colors hover:bg-hover hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col",
          density === "home" && "max-w-none gap-2 px-0 pb-0",
          density === "sidebar" && "max-w-none gap-4 px-0 pb-0",
          density === "default" && "max-w-[560px] gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6",
        )}
      >
        {simulated ? (
          <div className={cn("flex", density === "default" ? "justify-start" : "justify-end")}>
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              {t("Sandbox · simulated transaction")}
            </span>
          </div>
        ) : null}

        {showTitleBlock ? (
          <div className="pb-5">
            <h1 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[1.625rem]">
              {t(title)}
            </h1>
            {subtitle ? (
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{t(subtitle)}</p>
            ) : null}
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
