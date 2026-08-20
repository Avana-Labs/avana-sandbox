"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { BrandIcon, BrandLogo } from "@/app/components/brand-logo"
import { X } from "@/app/components/icons"
import { triggerPageLoading } from "@/app/lib/page-loading"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { AskAIPageClient } from "./ask-ai-page-client"
import { AskAIConvexBoundary } from "./ask-ai-convex-boundary"

/** The original focused `/ask` chrome, now containing the assistant-ui runtime. */
export function AskPageClient() {
  const router = useRouter()
  const { t } = useTranslation()

  const handleClose = () => {
    triggerPageLoading()
    if (typeof window !== "undefined" && window.history.length > 1) router.back()
    else router.push("/")
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-border bg-background px-4 text-foreground sm:px-6 lg:h-[68px] lg:px-5 xl:px-6 2xl:px-8">
        <Link href="/" aria-label={t("Home")} title={t("Home")} className="inline-flex min-w-0 items-center">
          <span className="xl:hidden">
            <BrandIcon />
          </span>
          <BrandLogo className="hidden h-[44px] xl:block" />
        </Link>

        <div className="pointer-events-none absolute left-1/2 w-[min(520px,calc(100%-128px))] -translate-x-1/2 text-center sm:w-[min(560px,calc(100%-192px))]">
          <div className="truncate text-[13px] font-medium leading-none text-foreground sm:text-sm">{t("Ask AI")}</div>
        </div>

        <button
          type="button"
          aria-label={t("Close")}
          onClick={handleClose}
          className="ml-auto inline-flex size-11 items-center justify-center rounded-full border border-brand/25 bg-brand text-white shadow-elev-1 transition-colors hover:bg-brand/90"
        >
          <X className="size-5" />
        </button>
      </header>

      <AskAIConvexBoundary>
        <AskAIPageClient />
      </AskAIConvexBoundary>
    </div>
  )
}
