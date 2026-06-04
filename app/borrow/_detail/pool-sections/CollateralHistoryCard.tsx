"use client"

import type { TxHistoryRow } from "@/app/lib/borrow-detail"
import { TransactionHistoryCard } from "@/app/borrow/_detail/asset-sections/TransactionHistoryCard"

type Props = {
  transactions: TxHistoryRow[]
  title?: string
  subtitle?: string
}

export function CollateralHistoryCard({
  transactions,
  title = "Transaction history",
  subtitle = "Recent activity for this market.",
}: Props) {
  return (
    <TransactionHistoryCard
      transactions={transactions}
      title={title}
      subtitle={subtitle}
    />
  )
}
