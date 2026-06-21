"use client"

import { useEffect, useState } from "react"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import type { useLendSession } from "@/app/lib/lend-system/use-lend-session"

type LendSession = ReturnType<typeof useLendSession>

export function useLendPageLive(walletId: string, lendSession: LendSession) {
  const [lendPage, setLendPage] = useState<LendPageData | null>(null)

  useEffect(() => {
    let cancelled = false

    void lendSession.readAdapter.readLendPage(walletId).then((next) => {
      if (!cancelled) {
        setLendPage(next)
      }
    })

    return () => {
      cancelled = true
    }
  }, [lendSession.readAdapter, lendSession.state, lendSession.transactionHistory, walletId])

  return lendPage
}
