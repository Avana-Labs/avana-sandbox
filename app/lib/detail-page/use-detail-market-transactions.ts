"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { DetailTransactionRow } from "@/app/lib/detail-page/transaction-history"
import { mergeTransactionRows } from "@/app/lib/detail-page/transaction-history"

type Scope = "asset" | "pool" | "lend" | "multiply"

export function useDetailMarketTransactions({
  scope,
  slug,
  seedRows,
  sessionRows = [],
  limit = 25,
  mapConvexRow,
}: {
  scope: Scope
  slug: string | undefined
  seedRows: DetailTransactionRow[]
  sessionRows?: DetailTransactionRow[]
  limit?: number
  mapConvexRow: (row: {
    id: string
    at: string
    kind: string
    amountLabel: string
    tokenAmountLabel?: string
    tokenSymbol?: string
    tokenSymbolSecondary?: string
    counterpartyLabel?: string
    walletLabel?: string
    txHashShort: string
  }) => DetailTransactionRow
}) {
  const convexRows = useQuery(api.markets.getRecentTransactions, slug ? { scope, slug, limit } : "skip")

  return React.useMemo(() => {
    const mappedConvex = (convexRows ?? []).map(mapConvexRow)
    if (convexRows === undefined) {
      return mergeTransactionRows(sessionRows, [], seedRows, limit)
    }
    return mergeTransactionRows(sessionRows, mappedConvex, [], limit)
  }, [convexRows, limit, mapConvexRow, seedRows, sessionRows])
}
