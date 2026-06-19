"use client"

import type { ReactNode } from "react"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"

export function AvanaSessionProviders({
  walletId,
  children,
}: {
  walletId?: string
  children: ReactNode
}) {
  return <AvanaSessionsProvider walletId={walletId}>{children}</AvanaSessionsProvider>
}
