import type { MultiplyTransactionPreview } from "@/app/lib/multiply-system/contracts"
import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"
import {
  formatActionApproxUsd,
  formatActionAmount,
  formatActionHealthFactor,
  formatActionNetworkFee,
  formatActionRatioPercent,
  formatActionUsd,
} from "@/app/lib/action-system/formatters"

export function mapMultiplyPreviewToActionUi(
  preview: MultiplyTransactionPreview,
  options: {
    collateralSymbol: string
    collateralAmount: number
    marketLabel: string
    multiplier: number
  },
): ActionPreviewUi {
  const health =
    preview.after.healthFactor === "infinity" ? Number.POSITIVE_INFINITY : preview.after.healthFactor

  return {
    allowed: preview.allowed,
    amountLabel: `${options.multiplier.toFixed(2)}x · ${formatActionAmount(options.collateralAmount, options.collateralSymbol, 4)}`,
    amountUsdLabel: formatActionApproxUsd(preview.after.collateralValueUsd),
    rateLabel: "Net APY",
    rateValue: formatActionRatioPercent(preview.after.netApy),
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: "Multiplier",
    balanceValue: `${options.multiplier.toFixed(2)}x`,
    maxAmount: options.multiplier,
    metrics: [
      {
        id: "exposure",
        label: "Total exposure",
        value: formatActionUsd(preview.after.collateralValueUsd),
      },
      {
        id: "debt",
        label: "Estimated debt",
        value: formatActionUsd(preview.after.debtValueUsd),
      },
      {
        id: "ltv",
        label: "LTV",
        value: formatActionRatioPercent(preview.after.ltv),
      },
      {
        id: "hf",
        label: "Health factor",
        value: formatActionHealthFactor(health),
        tone: Number.isFinite(health) && health < 1.5 ? "warning" : "default",
      },
    ],
    networkFeeLabel: formatActionNetworkFee(0.04),
    risk:
      preview.riskLabel === "danger"
        ? {
            level: "danger",
            title: "This multiply puts your position at risk",
            message: preview.validationErrors[0] ?? "Health factor is too low for this leverage.",
          }
        : null,
    blockedReason: preview.allowed ? null : (preview.validationErrors[0] ?? "Action unavailable"),
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
  }
}
