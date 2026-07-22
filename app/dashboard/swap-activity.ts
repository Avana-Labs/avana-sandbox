import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"
import { getSwapAsset, type SwapTransactionRecord } from "@/app/lib/swap-system"

function activityStatus(status: SwapTransactionRecord["status"]): PortfolioActivityRow["status"] {
  if (status === "confirmed") return "confirmed"
  if (status === "approval_pending" || status === "approval_confirmed" || status === "swap_pending") {
    return "pending"
  }
  return "failed"
}

function formatAmount(amount: number) {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

export function mapSwapTransactionHistoryToActivityRows(transactions: SwapTransactionRecord[]): PortfolioActivityRow[] {
  return transactions.map((transaction) => {
    const inputAsset = getSwapAsset(transaction.inputAssetId)
    const outputAsset = getSwapAsset(transaction.outputAssetId)
    const inputSymbol = inputAsset?.symbol ?? transaction.inputAssetId.toUpperCase()
    const outputSymbol = outputAsset?.symbol ?? transaction.outputAssetId.toUpperCase()
    const txHash = transaction.swapTransactionHash ?? transaction.approvalTransactionHash ?? transaction.id

    return {
      id: transaction.id,
      at: new Date(transaction.confirmedAt ?? transaction.createdAt).toISOString(),
      product: "swap",
      kind: "swap",
      status: activityStatus(transaction.status),
      amountUsd: -(transaction.inputAmount * (inputAsset?.priceUsd ?? 0)),
      primaryLabel: `${formatAmount(transaction.inputAmount)} ${inputSymbol} → ${formatAmount(transaction.outputAmount)} ${outputSymbol}`,
      secondaryLabel:
        transaction.status === "confirmed"
          ? transaction.provider
          : (transaction.failureReason ?? transaction.status.replaceAll("_", " ")),
      txHash,
    }
  })
}
