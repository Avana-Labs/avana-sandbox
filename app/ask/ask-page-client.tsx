"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BrandIcon, BrandLogo } from "@/app/components/brand-logo"
import { X } from "@/app/components/icons"
import { triggerPageLoading } from "@/app/lib/page-loading"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { resolveAskAICloseHref } from "@/app/lib/ask-ai/navigation"
import { useHydrated } from "@/app/lib/siwe/use-siwe-auth"
import { AskAIPageClient } from "./ask-ai-page-client"
import { AskAILoadingBody } from "./components/ask-ai-skeleton"
import { AskAIConvexBoundary } from "./ask-ai-convex-boundary"

/** The original focused `/ask` chrome, now containing the assistant-ui runtime. */
export function AskPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  // Blank → "Ask AI"; once a thread has a subject, show it here (summarized by CSS truncation).
  const [headerTitle, setHeaderTitle] = useState<string | null>(null)
  // The assistant-ui thread runtime is client-only; rendering it during SSR causes a hydration
  // mismatch. Gate it on the hydration flag so the server and first client render agree (no thread),
  // then mount it after hydration.
  const hydrated = useHydrated()

  const handleClose = () => {
    triggerPageLoading()
    router.push(resolveAskAICloseHref(searchParams.get("return")))
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
          <div className="truncate text-lg font-medium leading-none text-foreground">{headerTitle ?? t("Ask AI")}</div>
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
        {hydrated ? <AskAIPageClient onActiveTitleChange={setHeaderTitle} /> : <AskAILoadingBody />}
      </AskAIConvexBoundary>
    </div>
  )
}
