"use client"

import { useEffect, useState } from "react"
import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import type { useBorrowSession } from "@/app/lib/borrow-system/use-borrow-session"

type BorrowSession = ReturnType<typeof useBorrowSession>

export function useBorrowPageLive(walletId: string, borrowSession: BorrowSession) {
  const [borrowPage, setBorrowPage] = useState<BorrowPageData | null>(null)

  useEffect(() => {
    let cancelled = false

    void borrowSession.readAdapter.readBorrowPage(walletId).then((next) => {
      if (!cancelled) {
        setBorrowPage(next)
      }
    })

    return () => {
      cancelled = true
    }
  }, [borrowSession.readAdapter, borrowSession.state, borrowSession.transactionHistory, walletId])

  return borrowPage
}
