"use client"

import { useEffect, useRef } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { isKnownWalletProfileId } from "@/app/lib/data/mock/wallet/portfolio/profiles"
import type { TransactionHistoryItem } from "@/app/lib/borrow-system/contracts"
import { borrowHistoryItemToRecordArgs } from "./persistence"

/**
 * Persists every NEW successful borrow action to Convex via `recordTransaction`, so the
 * sandbox ledger lives wallet-scoped on the server (the §5 "persist via Convex
 * mutations" seam). Mirrors `useLiquidityLedgerBridge`:
 *
 *   - Mounted only when a Convex client exists, and keyed by wallet by the caller, so
 *     each wallet gets a fresh seen-set.
 *   - Snapshots the existing (seed/persisted) history as already-seen on mount, so only
 *     genuine new actions are persisted — never the in-browser seed.
 *   - Best-effort: the Credit Engine still drives the live UX; a persistence failure is
 *     swallowed (sandbox state is not the production source of truth).
 *   - Gated on the wallet being a real authed address — recordTransaction requires
 *     ctx.auth, so the unauthenticated demo wallet is skipped.
 *
 * Note: it intentionally does NOT pass the aggregate `ledger` delta — that stays owned
 * by `useLiquidityLedgerBridge` (recordDelta) to avoid double-counting. Unifying the
 * aggregate ledger onto recordTransaction is a documented cutover follow-up.
 */
export function SandboxPersistenceBridge({
  wallet,
  transactionHistory,
}: {
  wallet: string
  transactionHistory: TransactionHistoryItem[]
}) {
  const recordTransaction = useMutation(api.sandbox.transactions.recordTransaction)
  const seenRef = useRef<Set<string> | null>(null)
  const authed = !isKnownWalletProfileId(wallet)

  useEffect(() => {
    if (seenRef.current === null) {
      // First run for this wallet: treat existing history as already-persisted.
      seenRef.current = new Set(transactionHistory.map((item) => item.id))
      return
    }
    if (!authed) return
    for (const item of transactionHistory) {
      if (item.status !== "success" || seenRef.current.has(item.id)) continue
      seenRef.current.add(item.id)
      void recordTransaction(borrowHistoryItemToRecordArgs(item, wallet)).catch(() => {
        /* best-effort: sandbox state is not the production source of truth */
      })
    }
  }, [transactionHistory, recordTransaction, wallet, authed])

  return null
}
