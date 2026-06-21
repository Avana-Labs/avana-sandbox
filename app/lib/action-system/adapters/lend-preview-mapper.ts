import type { LendTransactionPreview } from "@/app/lib/lend-system/contracts"
import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"
import {
  formatActionApproxUsd,
  formatActionAmount,
  formatActionNetworkFee,
  formatActionRatioPercent,
  formatActionUsd,
} from "@/app/lib/action-system/formatters"

export function mapLendPreviewToActionUi(
  preview: LendTransactionPreview,
  options: {
    symbol: string
    amount: number
    marketLabel: string
    balanceLabel: string
    balanceAmount: number
    rateLabel: string
  },
): ActionPreviewUi {
  return {
    allowed: preview.allowed,
    amountLabel: formatActionAmount(options.amount, options.symbol, 4),
    amountUsdLabel: formatActionApproxUsd(preview.after.suppliedValueUsd),
    rateLabel: options.rateLabel,
    rateValue: formatActionRatioPercent(preview.after.currentApy),
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: options.balanceLabel,
    balanceValue: formatActionAmount(options.balanceAmount, options.symbol, 4),
    maxAmount: options.balanceAmount,
    metrics: [
      {
        id: "supplied-value",
        label: "Supplied value",
        value: formatActionUsd(preview.after.suppliedValueUsd),
      },
      {
        id: "interest-earned",
        label: "Interest earned",
        value: preview.after.interestEarned.toFixed(4),
      },
      {
        id: "total-earned",
        label: "Total earned",
        value: formatActionUsd(preview.after.totalEarnedUsd),
      },
    ],
    networkFeeLabel: formatActionNetworkFee(0.03),
    risk: null,
    blockedReason: preview.allowed ? null : (preview.validationErrors[0] ?? "Action unavailable"),
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
  }
}
