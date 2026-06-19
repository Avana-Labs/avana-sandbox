"use client"

import { useEffect, useState } from "react"
import type { PortfolioLendTabData } from "@/app/lib/data/providers/portfolio/types"
import type { useLendSession } from "@/app/lib/lend-system/use-lend-session"

type LendSession = ReturnType<typeof useLendSession>

export function usePortfolioLendLive(walletId: string, lendSession: LendSession) {
  const [portfolioLend, setPortfolioLend] = useState<PortfolioLendTabData | null>(null)

  useEffect(() => {
    let cancelled = false

    void lendSession.readAdapter.readPortfolioLend(walletId).then((next) => {
      if (!cancelled) setPortfolioLend(next)
    })

    return () => {
      cancelled = true
    }
  }, [lendSession.readAdapter, lendSession.state, lendSession.transactionHistory, walletId])

  return portfolioLend
}
