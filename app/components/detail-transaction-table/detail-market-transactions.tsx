"use client"

import * as React from "react"
import { DetailTransactionTable } from "@/app/components/detail-transaction-table/DetailTransactionTable"
import {
  BORROW_ASSET_KIND_CONFIG,
  BORROW_POOL_KIND_CONFIG,
  LEND_KIND_CONFIG,
  MULTIPLY_KIND_CONFIG,
  type DetailTransactionPreset,
  type TransactionKindConfig,
} from "@/app/components/detail-transaction-table/kind-configs"
import type { DetailTransactionRow } from "@/app/lib/detail-page/transaction-history"
import { enrichDetailTransactionRow } from "@/app/lib/detail-page/transaction-history"
import { useDetailMarketTransactions } from "@/app/lib/detail-page/use-detail-market-transactions"

type Scope = "asset" | "pool" | "lend" | "multiply"

type Props = {
  scope: Scope
  slug: string | undefined
  seedRows: DetailTransactionRow[]
  sessionRows?: DetailTransactionRow[]
  preset?: DetailTransactionPreset
  kindConfig: TransactionKindConfig
  context?: Record<string, string>
  title?: string
}

export function DetailMarketTransactions({
  scope,
  slug,
  seedRows,
  sessionRows = [],
  preset = "standard",
  kindConfig,
  context,
  title,
}: Props) {
  const transactions = useDetailMarketTransactions({
    scope,
    slug,
    seedRows,
    sessionRows,
    mapConvexRow: (row) => ({
      id: row.id,
      at: row.at,
      kind: row.kind,
      amountLabel: row.amountLabel,
      tokenAmountLabel: row.tokenAmountLabel,
      tokenSymbol: row.tokenSymbol,
      tokenSymbolSecondary: row.tokenSymbolSecondary,
      counterpartyLabel: row.counterpartyLabel,
      walletLabel: row.walletLabel,
      txHashShort: row.txHashShort,
    }),
  })

  const enrichedTransactions = React.useMemo(
    () => transactions.map((row) => enrichDetailTransactionRow(row, context ?? {}, preset)),
    [context, preset, transactions],
  )

  return (
    <DetailTransactionTable
      transactions={enrichedTransactions}
      preset={preset}
      kindConfig={kindConfig}
      context={context}
      title={title}
    />
  )
}

export { BORROW_ASSET_KIND_CONFIG, BORROW_POOL_KIND_CONFIG, LEND_KIND_CONFIG, MULTIPLY_KIND_CONFIG }
