import { formatFixed } from "@/app/lib/credit-engine"
import type { TransactionPreview } from "@/app/lib/borrow-system/contracts"
import type { BorrowSimulationResult } from "@/app/lib/credit-engine/simulation"
import type { ActionPreviewUi, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import {
  formatActionApproxUsd,
  formatActionAmount,
  formatActionBeforeAfter,
  formatActionFeeSummary,
  formatActionHealthFactor,
  formatActionInputAmount,
  formatActionPercent,
  formatActionRatioPercent,
  formatActionPercentBeforeAfter,
  formatActionUsd,
  formatActionUsdBeforeAfter,
} from "@/app/lib/action-system/formatters"

function fixedToNumber(value: bigint, decimals: number) {
  return Number.parseFloat(formatFixed(value, decimals))
}

function hfToNumber(value: bigint | null) {
  if (value == null || value === 0n) return Number.POSITIVE_INFINITY
  return fixedToNumber(value, 18)
}

function hfTone(value: number | null): "default" | "positive" | "warning" | "danger" {
  if (value == null || !Number.isFinite(value)) return "positive"
  if (value < 1.05) return "danger"
  if (value < 1.5) return "warning"
  return "positive"
}

function riskFromPreview(preview: TransactionPreview, healthAfter: number) {
  if (preview.riskLabel === "danger" || (Number.isFinite(healthAfter) && healthAfter < 1.05)) {
    return {
      level: "danger" as const,
      title: "This borrow puts your position at risk",
      message: `Health factor will drop to ${formatActionHealthFactor(healthAfter)} after this transaction. You are at risk of liquidation.`,
    }
  }
  if (preview.riskLabel === "warning" || (Number.isFinite(healthAfter) && healthAfter < 1.5)) {
    return {
      level: "warning" as const,
      title: "Borrowing gets tighter",
      message: `Health factor will be ${formatActionHealthFactor(healthAfter)} after this transaction.`,
    }
  }
  return null
}

function netBalanceUsd(preview: TransactionPreview, side: "before" | "after") {
  const snapshot = side === "before" ? preview.before : preview.after
  const collateral = fixedToNumber(snapshot.collateralValueUsd6, 6)
  const borrowed = fixedToNumber(snapshot.totalBorrowedUsd6, 6)
  return collateral - borrowed
}

function borrowingPowerUsd(preview: TransactionPreview, side: "before" | "after") {
  const snapshot = side === "before" ? preview.before : preview.after
  return fixedToNumber(snapshot.availableBorrowCapacityUsd6, 6)
}

export function mapBorrowTransactionPreviewToActionUi(
  preview: TransactionPreview,
  options: {
    symbol: string
    amountUsd: number
    marketLabel: string
    ratePct: number
    balanceLabel: string
    balanceUsd: number
    rateLabel?: string
  },
): ActionPreviewUi {
  const beforeCollateral = fixedToNumber(preview.before.collateralValueUsd6, 6)
  const afterCollateral = fixedToNumber(preview.after.collateralValueUsd6, 6)
  const healthBefore = hfToNumber(preview.before.healthFactorWad)
  const healthAfter = hfToNumber(preview.after.healthFactorWad)
  const beforeApy = options.ratePct
  const afterApy = options.ratePct

  return {
    allowed: preview.allowed,
    amountLabel: formatActionAmount(options.amountUsd, options.symbol, 2),
    amountUsdLabel: formatActionApproxUsd(options.amountUsd),
    rateLabel: options.rateLabel ?? "Borrow APY",
    rateValue: formatActionPercent(options.ratePct),
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: options.balanceLabel,
    balanceValue: formatActionUsd(options.balanceUsd),
    maxAmount: options.balanceUsd,
    metrics: [
      {
        id: "position-apy",
        label: "Position APY",
        value: formatActionPercentBeforeAfter(beforeApy, afterApy),
        before: formatActionPercent(beforeApy),
        after: formatActionPercent(afterApy),
      },
      {
        id: "borrowing-power",
        label: "Borrowing power",
        value: formatActionUsdBeforeAfter(borrowingPowerUsd(preview, "before"), borrowingPowerUsd(preview, "after")),
        before: formatActionUsd(borrowingPowerUsd(preview, "before")),
        after: formatActionUsd(borrowingPowerUsd(preview, "after")),
      },
      {
        id: "net-balance",
        label: "Net balance",
        value: formatActionUsdBeforeAfter(netBalanceUsd(preview, "before"), netBalanceUsd(preview, "after")),
        before: formatActionUsd(netBalanceUsd(preview, "before")),
        after: formatActionUsd(netBalanceUsd(preview, "after")),
      },
      {
        id: "net-collateral",
        label: "Net collateral",
        value: formatActionUsdBeforeAfter(beforeCollateral, afterCollateral),
        before: formatActionUsd(beforeCollateral),
        after: formatActionUsd(afterCollateral),
      },
      {
        id: "health-factor",
        label: "Health factor",
        value: formatActionBeforeAfter(formatActionHealthFactor(healthBefore), formatActionHealthFactor(healthAfter)),
        before: formatActionHealthFactor(healthBefore),
        after: formatActionHealthFactor(healthAfter),
        tone: hfTone(healthAfter),
      },
    ],
    networkFeeLabel: formatActionFeeSummary(options.amountUsd, 0.04),
    risk: riskFromPreview(preview, healthAfter),
    blockedReason: preview.allowed ? null : (preview.validationErrors[0] ?? "Action unavailable"),
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
  }
}

export function mapBorrowRepayPreviewToActionUi(
  preview: TransactionPreview,
  options: {
    symbol: string
    amountUsd: number
    marketLabel: string
    remainingDebtUsd: number
    yearlyInterestSavedUsd: number
  },
): ActionPreviewUi {
  const beforeDebt = fixedToNumber(preview.before.totalBorrowedUsd6, 6)
  const afterDebt = fixedToNumber(preview.after.totalBorrowedUsd6, 6)
  const healthBefore = hfToNumber(preview.before.healthFactorWad)
  const healthAfter = hfToNumber(preview.after.healthFactorWad)

  return {
    allowed: preview.allowed,
    amountLabel: formatActionAmount(options.amountUsd, options.symbol, 2),
    amountUsdLabel: formatActionApproxUsd(options.amountUsd),
    rateLabel: "Repay amount",
    rateValue: formatActionUsd(options.amountUsd),
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: "Remaining debt",
    balanceValue: formatActionUsd(options.remainingDebtUsd),
    maxAmount: beforeDebt,
    metrics: [
      {
        id: "remaining-debt",
        label: "Remaining debt",
        value: formatActionUsdBeforeAfter(beforeDebt, afterDebt),
        before: formatActionUsd(beforeDebt),
        after: formatActionUsd(afterDebt),
      },
      {
        id: "health-factor",
        label: "Health factor after",
        value: formatActionBeforeAfter(formatActionHealthFactor(healthBefore), formatActionHealthFactor(healthAfter)),
        before: formatActionHealthFactor(healthBefore),
        after: formatActionHealthFactor(healthAfter),
        tone: hfTone(healthAfter),
      },
      {
        id: "interest-saved",
        label: "Interest saved (est. yearly)",
        value: formatActionUsd(options.yearlyInterestSavedUsd),
        tone: options.yearlyInterestSavedUsd > 0 ? "positive" : "default",
      },
    ],
    networkFeeLabel: formatActionFeeSummary(options.amountUsd, 0.04),
    risk: riskFromPreview(preview, healthAfter),
    blockedReason: preview.allowed ? null : (preview.validationErrors[0] ?? "Action unavailable"),
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
  }
}

export function mapBorrowSupplyPreviewToActionUi(
  preview: TransactionPreview,
  options: {
    symbol: string
    amountUsd: number
    marketLabel: string
    poolLabel: string
    collateralSymbol: string
    borrowSymbol: string
    collateralFactorPct: number
    collateralRiskPct: number
    borrowableAssetsLabel: string
    borrowableAssetSymbols: string[]
  },
): ActionPreviewUi {
  const borrowPowerBefore = borrowingPowerUsd(preview, "before")
  const borrowPowerAfter = borrowingPowerUsd(preview, "after")
  const healthBefore = hfToNumber(preview.before.healthFactorWad)
  const healthAfter = hfToNumber(preview.after.healthFactorWad)

  return {
    allowed: preview.allowed,
    amountLabel: formatActionUsd(options.amountUsd),
    amountValue: formatActionInputAmount(options.amountUsd, 2),
    assetLabel: options.poolLabel,
    assetSymbol: options.collateralSymbol,
    borrowSymbol: options.borrowSymbol,
    amountUsdLabel: formatActionApproxUsd(options.amountUsd),
    rateLabel: "Collateral factor",
    rateValue: formatActionPercent(options.collateralFactorPct),
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: "Borrow power",
    balanceValue: formatActionUsd(borrowPowerAfter),
    maxAmount: null,
    metrics: [
      {
        id: "collateral-factor",
        label: "Collateral factor",
        value: formatActionPercent(options.collateralFactorPct),
      },
      {
        id: "collateral-risk",
        label: "Collateral risk",
        value: formatActionPercent(options.collateralRiskPct),
        tone: options.collateralRiskPct > 15 ? "warning" : "default",
      },
      {
        id: "borrowable-assets",
        label: "Borrowable assets",
        value: options.borrowableAssetsLabel,
        tokenSymbols: options.borrowableAssetSymbols,
      },
      {
        id: "borrow-power",
        label: "Borrowing power",
        value: formatActionUsdBeforeAfter(borrowPowerBefore, borrowPowerAfter),
        before: formatActionUsd(borrowPowerBefore),
        after: formatActionUsd(borrowPowerAfter),
      },
      {
        id: "hf",
        label: "Health factor",
        value: formatActionBeforeAfter(formatActionHealthFactor(healthBefore), formatActionHealthFactor(healthAfter)),
        before: formatActionHealthFactor(healthBefore),
        after: formatActionHealthFactor(healthAfter),
        tone: hfTone(healthAfter),
      },
    ],
    networkFeeLabel: formatActionFeeSummary(options.amountUsd, 0.04),
    risk: null,
    blockedReason: preview.allowed ? null : (preview.validationErrors[0] ?? "Action unavailable"),
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
  }
}

export function mapBorrowRemovePreviewToActionUi(
  preview: TransactionPreview,
  options: {
    percent: number
    safePercent: number
    removeUsd: number
    marketLabel: string
    positionApyPct: number
  },
): ActionPreviewUi {
  const beforeCollateral = fixedToNumber(preview.before.collateralValueUsd6, 6)
  const afterCollateral = fixedToNumber(preview.after.collateralValueUsd6, 6)
  const annualBefore = (beforeCollateral * options.positionApyPct) / 100
  const annualAfter = (afterCollateral * options.positionApyPct) / 100
  const healthBefore = hfToNumber(preview.before.healthFactorWad)
  const healthAfter = hfToNumber(preview.after.healthFactorWad)

  return {
    allowed: preview.allowed,
    amountLabel: `${options.percent}%`,
    amountUsdLabel: formatActionApproxUsd(options.removeUsd),
    rateLabel: "Position APY",
    rateValue: formatActionPercent(options.positionApyPct),
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: "Removing",
    balanceValue: formatActionUsd(options.removeUsd),
    maxAmount: options.safePercent,
    metrics: [
      {
        id: "position-apy",
        label: "Position APY",
        value: formatActionPercent(options.positionApyPct),
      },
      {
        id: "annual-earnings",
        label: "Annual earnings",
        value: formatActionUsdBeforeAfter(annualBefore, annualAfter),
        before: formatActionUsd(annualBefore),
        after: formatActionUsd(annualAfter),
      },
      {
        id: "borrowing-power",
        label: "Borrowing power",
        value: formatActionUsdBeforeAfter(borrowingPowerUsd(preview, "before"), borrowingPowerUsd(preview, "after")),
        before: formatActionUsd(borrowingPowerUsd(preview, "before")),
        after: formatActionUsd(borrowingPowerUsd(preview, "after")),
      },
      {
        id: "net-balance",
        label: "Net balance",
        value: formatActionUsdBeforeAfter(netBalanceUsd(preview, "before"), netBalanceUsd(preview, "after")),
        before: formatActionUsd(netBalanceUsd(preview, "before")),
        after: formatActionUsd(netBalanceUsd(preview, "after")),
      },
      {
        id: "net-collateral",
        label: "Net collateral",
        value: formatActionUsdBeforeAfter(beforeCollateral, afterCollateral),
        before: formatActionUsd(beforeCollateral),
        after: formatActionUsd(afterCollateral),
      },
      {
        id: "hf",
        label: "Health factor",
        value: formatActionBeforeAfter(formatActionHealthFactor(healthBefore), formatActionHealthFactor(healthAfter)),
        before: formatActionHealthFactor(healthBefore),
        after: formatActionHealthFactor(healthAfter),
        tone: hfTone(healthAfter),
      },
    ],
    networkFeeLabel: formatActionFeeSummary(options.removeUsd, 0.04),
    risk: riskFromPreview(preview, hfToNumber(preview.after.healthFactorWad)),
    blockedReason: preview.allowed ? null : (preview.validationErrors[0] ?? "Action unavailable"),
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
  }
}

export function mapLiquidationPreviewToActionUi(
  simulation: BorrowSimulationResult,
  options: {
    amountUsd: number
    marketLabel: string
    debtSymbol: string
  },
): ActionPreviewUi {
  const healthBefore = hfToNumber(simulation.before.metrics.healthFactorWad)
  const healthAfter = hfToNumber(simulation.after.metrics.healthFactorWad)
  const beforeCollateral = fixedToNumber(simulation.before.metrics.collateralValueUsd6, 6)
  const afterCollateral = fixedToNumber(simulation.after.metrics.collateralValueUsd6, 6)
  const beforeDebt = fixedToNumber(simulation.before.metrics.totalBorrowedUsd6, 6)
  const afterDebt = fixedToNumber(simulation.after.metrics.totalBorrowedUsd6, 6)

  return {
    allowed: simulation.allowed,
    amountLabel: formatActionAmount(options.amountUsd, options.debtSymbol, 2),
    amountUsdLabel: formatActionApproxUsd(options.amountUsd),
    rateLabel: "Liquidation",
    rateValue: formatActionUsd(options.amountUsd),
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: "Estimated repay",
    balanceValue: formatActionUsd(options.amountUsd),
    maxAmount: null,
    metrics: [
      {
        id: "collateral",
        label: "Collateral",
        value: formatActionUsdBeforeAfter(beforeCollateral, afterCollateral),
        before: formatActionUsd(beforeCollateral),
        after: formatActionUsd(afterCollateral),
      },
      {
        id: "debt",
        label: "Debt",
        value: formatActionUsdBeforeAfter(beforeDebt, afterDebt),
        before: formatActionUsd(beforeDebt),
        after: formatActionUsd(afterDebt),
      },
      {
        id: "health-factor",
        label: "Health factor",
        value: formatActionBeforeAfter(formatActionHealthFactor(healthBefore), formatActionHealthFactor(healthAfter)),
        before: formatActionHealthFactor(healthBefore),
        after: formatActionHealthFactor(healthAfter),
        tone: hfTone(healthAfter),
      },
    ],
    networkFeeLabel: formatActionFeeSummary(options.amountUsd, 0.04),
    risk:
      simulation.riskLabel === "danger"
        ? {
            level: "danger",
            title: "Liquidation leaves position at risk",
            message: simulation.validationErrors[0] ?? simulation.warnings[0] ?? "Health factor is too low.",
          }
        : simulation.riskLabel === "warning"
          ? {
              level: "warning",
              title: "Liquidation impact",
              message: simulation.warnings[0] ?? "Health factor is declining.",
            }
          : null,
    blockedReason: simulation.allowed ? null : (simulation.validationErrors[0] ?? "Liquidation unavailable"),
    validationErrors: simulation.validationErrors,
    warnings: simulation.warnings,
  }
}

export function mapBorrowSuccessToActionUi(options: {
  title: string
  description: string
  receiptHash: string | null
  metrics: ActionPreviewUi["metrics"]
  href: string
  primaryCtaLabel?: string
  preview?: Pick<ActionPreviewUi, "amountLabel" | "rateLabel" | "rateValue" | "marketValue"> | null
  verb?: string
}): ActionSuccessUi {
  return {
    title: options.title,
    description: options.description,
    receiptHash: options.receiptHash,
    metrics: options.metrics,
    primaryCtaLabel: options.primaryCtaLabel ?? "View dashboard",
    primaryCtaHref: options.href,
    secondaryCtaLabel: "Done",
    receiptContext: options.preview
      ? {
          verb: options.verb ?? "Action",
          amountLabel: options.preview.amountLabel,
          rateLabel: options.preview.rateLabel,
          rateValue: options.preview.rateValue,
          marketValue: options.preview.marketValue,
        }
      : undefined,
  }
}

export function mapLtvBeforeAfter(preview: TransactionPreview) {
  const before = formatActionRatioPercent(fixedToNumber(preview.before.currentLtvWad, 18))
  const after = formatActionRatioPercent(fixedToNumber(preview.after.currentLtvWad, 18))
  return `${before} → ${after}`
}
