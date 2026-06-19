"use client"

import { useEffect, useState } from "react"
import type { PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"
import type { useMultiplySession } from "@/app/lib/multiply-system/use-multiply-session"

type MultiplySession = ReturnType<typeof useMultiplySession>

export function usePortfolioMultiplyLive(walletId: string, multiplySession: MultiplySession) {
  const [portfolioMultiply, setPortfolioMultiply] = useState<PortfolioMultiplyTabData | null>(null)

  useEffect(() => {
    let cancelled = false

    void multiplySession.readAdapter.readPortfolioMultiply(walletId).then((next) => {
      if (!cancelled) {
        setPortfolioMultiply(next)
      }
    })

    return () => {
      cancelled = true
    }
  }, [multiplySession.readAdapter, multiplySession.state, multiplySession.transactionHistory, walletId])

  return portfolioMultiply
}
