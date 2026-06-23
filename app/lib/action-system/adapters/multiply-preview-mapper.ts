import type { MultiplyTransactionPreview } from "@/app/lib/multiply-system/contracts"
import type { ActionMetricTone, ActionPreviewUi } from "@/app/lib/action-system/contracts"
import {
  formatActionApproxUsd,
  formatActionAmount,
  formatActionBeforeAfter,
  formatActionHealthFactor,
  formatActionNetworkFee,
  formatActionRatioPercent,
  formatActionUsd,
} from "@/app/lib/action-system/formatters"

function hfTone(value: number) {
  if (!Number.isFinite(value)) return "positive" as const
  if (value < 1.05) return "danger" as const
  if (value < 1.5) return "warning" as const
  return "positive" as const
}

function hfNumber(value: number | "infinity") {
  return value === "infinity" ? Number.POSITIVE_INFINITY : value
}

function metricBeforeAfter(
  id: string,
  label: string,
  before: string,
  after: string,
  tone?: ActionMetricTone,
) {
  return {
    id,
    label,
    value: formatActionBeforeAfter(before, after),
    before,
    after,
    tone,
  }
}

export function mapMultiplyPreviewToActionUi(
  preview: MultiplyTransactionPreview,
  options: {
    collateralSymbol: string
    borrowSymbol: string
    collateralAmount: number
    marketLabel: string
    collateralApy: number
    borrowApy: number
    multiplier: number
  },
): ActionPreviewUi {
  const healthAfter = hfNumber(preview.after.healthFactor)
  const liqPrice = preview.simulationSummary?.liquidationPrice
  const liquidationError = preview.validationErrors.find((entry) => entry.toLowerCase().includes("health factor"))
  const riskMessage =
    preview.warnings.find((entry) => entry.toLowerCase().includes("liquidation")) ??
    preview.warnings[0] ??
    "This leverage reduces your safety buffer."

  return {
    allowed: preview.allowed,
    amountLabel: `${options.multiplier.toFixed(2)}x · ${formatActionAmount(options.collateralAmount, options.collateralSymbol, 4)}`,
    amountUsdLabel: formatActionApproxUsd(preview.after.collateralValueUsd),
    rateLabel: "Net APY",
    rateValue: formatActionRatioPercent(preview.after.netApy),
    marketLabel: "Market",
    marketValue: options.marketLabel,
    marketBreakdown: {
      collateral: {
        symbol: options.collateralSymbol,
        apy: formatActionRatioPercent(options.collateralApy),
      },
      borrow: {
        symbol: options.borrowSymbol,
        apy: formatActionRatioPercent(options.borrowApy),
      },
    },
    balanceLabel: "Multiplier",
    balanceValue: `${options.multiplier.toFixed(2)}x`,
    maxAmount: options.multiplier,
    metrics: [
      metricBeforeAfter(
        "exposure",
        "Exposure",
        formatActionUsd(preview.before.collateralValueUsd),
        formatActionUsd(preview.after.collateralValueUsd),
      ),
      metricBeforeAfter(
        "debt",
        "Estimated debt",
        formatActionUsd(preview.before.debtValueUsd),
        formatActionUsd(preview.after.debtValueUsd),
      ),
      metricBeforeAfter(
        "ltv",
        "LTV",
        formatActionRatioPercent(preview.before.ltv),
        formatActionRatioPercent(preview.after.ltv),
      ),
      metricBeforeAfter(
        "hf",
        "Health factor",
        formatActionHealthFactor(hfNumber(preview.before.healthFactor)),
        formatActionHealthFactor(healthAfter),
        hfTone(healthAfter),
      ),
      metricBeforeAfter(
        "net-apy",
        "Net APY",
        formatActionRatioPercent(preview.before.netApy),
        formatActionRatioPercent(preview.after.netApy),
      ),
      {
        id: "liq-price",
        label: "Liquidation price",
        value: liqPrice != null ? formatActionUsd(liqPrice) : "—",
      },
    ],
    networkFeeLabel: formatActionNetworkFee(0.04),
    risk:
      preview.riskLabel === "danger" || (Number.isFinite(healthAfter) && healthAfter < 1.05)
        ? {
            level: "danger",
            title: "Risk of liquidation",
            message:
              liquidationError ??
              "Health factor is too low for this leverage.",
          }
        : preview.warnings.length > 0
          ? {
              level: "warning",
              title: "Review leverage carefully",
              message: riskMessage,
            }
          : null,
    blockedReason: preview.allowed ? null : (preview.validationErrors[0] ?? "Action unavailable"),
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
  }
}

export function mapDeleveragePreviewToActionUi(
  preview: MultiplyTransactionPreview,
  options: {
    marketLabel: string
    targetMultiplier: number
  },
): ActionPreviewUi {
  const healthAfter = hfNumber(preview.after.healthFactor)
  const liqPrice = preview.simulationSummary?.liquidationPrice

  return {
    allowed: preview.allowed,
    amountLabel: `${options.targetMultiplier.toFixed(2)}x target`,
    amountUsdLabel: formatActionApproxUsd(preview.after.collateralValueUsd),
    rateLabel: "Net APY",
    rateValue: formatActionRatioPercent(preview.after.netApy),
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: "Target multiplier",
    balanceValue: `${options.targetMultiplier.toFixed(2)}x`,
    maxAmount: preview.before.multiplier,
    metrics: [
      metricBeforeAfter(
        "exposure",
        "Exposure",
        formatActionUsd(preview.before.collateralValueUsd),
        formatActionUsd(preview.after.collateralValueUsd),
      ),
      metricBeforeAfter(
        "debt",
        "Estimated debt",
        formatActionUsd(preview.before.debtValueUsd),
        formatActionUsd(preview.after.debtValueUsd),
      ),
      metricBeforeAfter(
        "ltv",
        "LTV",
        formatActionRatioPercent(preview.before.ltv),
        formatActionRatioPercent(preview.after.ltv),
      ),
      metricBeforeAfter(
        "hf",
        "Health factor",
        formatActionHealthFactor(hfNumber(preview.before.healthFactor)),
        formatActionHealthFactor(healthAfter),
        hfTone(healthAfter),
      ),
      metricBeforeAfter(
        "net-apy",
        "Net APY",
        formatActionRatioPercent(preview.before.netApy),
        formatActionRatioPercent(preview.after.netApy),
      ),
      {
        id: "liq-price",
        label: "Liquidation price",
        value: liqPrice != null ? formatActionUsd(liqPrice) : "—",
      },
    ],
    networkFeeLabel: formatActionNetworkFee(0.04),
    risk:
      preview.riskLabel === "danger"
        ? {
            level: "danger",
            title: "This deleverage still leaves risk",
            message: preview.validationErrors[0] ?? "Health factor remains too low.",
          }
        : null,
    blockedReason: preview.allowed ? null : (preview.validationErrors[0] ?? "Action unavailable"),
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
  }
}
