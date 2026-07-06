"use client"

import * as React from "react"

/**
 * Calls `refetch` whenever `transactionCount` increases — i.e. a borrow / repay /
 * withdraw / supply / remove action just landed.
 *
 * The dashboard's live position tables are reactive through the session store, but the
 * one-shot portfolio snapshot (`usePortfolioPage`) is a non-reactive HTTP fetch that
 * otherwise only refreshes on a full route reload. Wiring this to the running
 * transaction count guarantees the snapshot-backed surfaces (fallback rows, Lend /
 * Multiply hero chart series) can never render stale data after an action.
 *
 * Does not fire on mount — only on a genuine increase — so the initial fetch is not
 * duplicated and a decreasing/steady count (e.g. wallet switch) does not thrash.
 */
export function useRefetchOnTransaction(transactionCount: number, refetch: () => void): void {
  const lastSyncedRef = React.useRef(transactionCount)
  React.useEffect(() => {
    if (transactionCount <= lastSyncedRef.current) {
      lastSyncedRef.current = transactionCount
      return
    }
    lastSyncedRef.current = transactionCount
    refetch()
  }, [transactionCount, refetch])
}
