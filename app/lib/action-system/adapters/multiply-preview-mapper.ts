import type { MultiplyTransactionPreview } from "@/app/lib/multiply-system/contracts"
import type { ActionMetricTone, ActionPreviewUi } from "@/app/lib/action-system/contracts"
import {
  formatActionApproxUsd,
  formatActionAmount,
  formatActionBeforeAfter,
  formatActionHealthFactor,
  formatActionFeeSummary,
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

function metricValue(
  id: string,
  label: string,
  value: string,
  tone?: ActionMetricTone,
) {
  return {
    id,
    label,
    value,
    tone,
  }
}

function addedValue(after: number, before: number) {
  return Math.max(0, after - before)
}

export function mapMultiplyPreviewToActionUi(
  preview: MultiplyTransactionPreview,
  options: {
    collateralSymbol: string
    borrowSymbol: string
    collateralAmount: number
    collateralPriceUsd: number
    marketLabel: string
    collateralApy: number
    borrowApy: number
    multiplier: number
    maxLtv: number
  },
): ActionPreviewUi {
  const healthAfter = hfNumber(preview.after.healthFactor)
  const liqPrice = preview.simulationSummary?.liquidationPrice
  const liquidationError = preview.validationErrors.find((entry) => entry.toLowerCase().includes("health factor"))
  const riskMessage =
    preview.warnings.find((entry) => entry.toLowerCase().includes("liquidation")) ??
    preview.warnings[0] ??
    "This leverage reduces your safety buffer."
  const hasExistingPosition = preview.before.collateralValueUsd > 0 || preview.before.debtValueUsd > 0
  const addedExposureUsd = addedValue(preview.after.collateralValueUsd, preview.before.collateralValueUsd)
  const addedDebtUsd = addedValue(preview.after.debtValueUsd, preview.before.debtValueUsd)
  const borrowCapacityUsd = Math.max(
    0,
    preview.after.collateralValueUsd * options.maxLtv - preview.after.debtValueUsd,
  )
  const maxBorrowUsd = preview.after.collateralValueUsd * options.maxLtv
  const borrowCapacityRatio = maxBorrowUsd > 0 ? borrowCapacityUsd / maxBorrowUsd : 1
  const borrowCapacityTone =
    borrowCapacityRatio < 0.1 ? "danger" : borrowCapacityRatio < 0.25 ? "warning" : "positive"
  const metrics = [
    metricValue(
      "collateral-supplied",
      "Collateral supplied",
      formatActionAmount(options.collateralAmount, options.collateralSymbol, 6),
    ),
    metricValue(
      "collateral-value",
      "Collateral value",
      formatActionUsd(options.collateralAmount * options.collateralPriceUsd),
    ),
    metricValue("target-leverage", "Target leverage", `${options.multiplier.toFixed(2)}x`),
    metricValue("looped-exposure", "Looped exposure", formatActionUsd(addedExposureUsd)),
    metricValue("borrowed-amount", `${options.borrowSymbol} borrowed`, formatActionUsd(addedDebtUsd)),
    metricValue(
      "borrow-capacity",
      "Borrow capacity remaining",
      formatActionUsd(borrowCapacityUsd),
      borrowCapacityTone,
    ),
    metricValue(
      "ltv",
      hasExistingPosition ? "Projected LTV" : "LTV",
      formatActionRatioPercent(preview.after.ltv),
    ),
    metricValue(
      "hf",
      hasExistingPosition ? "Projected health factor" : "Health factor",
      formatActionHealthFactor(healthAfter),
      hfTone(healthAfter),
    ),
    metricValue(
      "net-apy",
      hasExistingPosition ? "Projected net APY" : "Net APY",
      formatActionRatioPercent(preview.after.netApy),
    ),
    {
      id: "liq-price",
      label: "Liquidation price",
      value: liqPrice != null ? formatActionUsd(liqPrice) : "—",
    },
  ]

  return {
    allowed: preview.allowed,
    amountTitle: "Collateral supplied",
    amountLabel: formatActionAmount(options.collateralAmount, options.collateralSymbol, 6),
    amountValue: String(options.collateralAmount),
    assetLabel: options.collateralSymbol,
    assetSymbol: options.collateralSymbol,
    amountUsdLabel: formatActionApproxUsd(options.collateralAmount * options.collateralPriceUsd),
    rateLabel: "",
    rateValue: "",
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
    balanceLabel: "Selected leverage",
    balanceValue: `${options.multiplier.toFixed(2)}x`,
    maxAmount: options.multiplier,
    metrics,
    networkFeeLabel: formatActionFeeSummary(preview.after.collateralValueUsd, 0.04),
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
    collateralSymbol: string
  },
): ActionPreviewUi {
  const healthAfter = hfNumber(preview.after.healthFactor)
  const liqPrice = preview.simulationSummary?.liquidationPrice

  return {
    allowed: preview.allowed,
    amountLabel: `${options.targetMultiplier.toFixed(2)}x ${options.collateralSymbol}`,
    amountValue: `${options.targetMultiplier.toFixed(2)}x`,
    assetLabel: options.collateralSymbol,
    assetSymbol: options.collateralSymbol,
    amountUsdLabel: formatActionApproxUsd(preview.after.collateralValueUsd),
    rateLabel: "",
    rateValue: "",
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
    networkFeeLabel: formatActionFeeSummary(preview.after.collateralValueUsd, 0.04),
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
