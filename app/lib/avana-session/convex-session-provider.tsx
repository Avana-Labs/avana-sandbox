"use client"

import { type ReactNode } from "react"
import { useConvexAuth } from "convex/react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { ConvexAvanaSessionsProvider } from "./convex-avana-sessions-provider"

export function ConvexSessionProvider({ walletId, children }: { walletId: string; children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const { t } = useTranslation()

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-2 w-40 animate-pulse rounded-full bg-muted" aria-label={t("Authenticating wallet session")} />
      </div>
    )
  }

  return <ConvexAvanaSessionsProvider walletId={walletId}>{children}</ConvexAvanaSessionsProvider>
}
