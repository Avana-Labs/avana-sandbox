import { formatFixed } from "@/app/lib/credit-engine"
import type { TransactionPreview } from "@/app/lib/borrow-system/contracts"
import type { ActionPreviewUi, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import {
  formatActionApproxUsd,
  formatActionAmount,
  formatActionHealthFactor,
  formatActionNetworkFee,
  formatActionPercent,
  formatActionRatioPercent,
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

function hfTone(value: number | null): "default" | "warning" | "danger" {
  if (value == null || !Number.isFinite(value)) return "default"
  if (value < 1.05) return "danger"
  if (value < 1.5) return "warning"
  return "default"
}

function riskFromPreview(preview: TransactionPreview, healthAfter: number) {
  if (preview.riskLabel === "danger" || (Number.isFinite(healthAfter) && healthAfter < 1.05)) {
    return {
      level: "danger" as const,
      title: "This action puts your position at risk",
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
  const beforeBorrowed = fixedToNumber(preview.before.totalBorrowedUsd6, 6)
  const afterBorrowed = fixedToNumber(preview.after.totalBorrowedUsd6, 6)
  const beforeCapacity = fixedToNumber(preview.before.availableBorrowCapacityUsd6, 6)
  const afterCapacity = fixedToNumber(preview.after.availableBorrowCapacityUsd6, 6)
  const beforeCollateral = fixedToNumber(preview.before.collateralValueUsd6, 6)
  const afterCollateral = fixedToNumber(preview.after.collateralValueUsd6, 6)
  const healthAfter = hfToNumber(preview.after.healthFactorWad)

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
        id: "borrowing-power",
        label: "Borrowing power",
        value: formatActionUsdBeforeAfter(beforeCapacity + beforeBorrowed - beforeBorrowed, afterCapacity + afterBorrowed - afterBorrowed),
      },
      {
        id: "net-collateral",
        label: "Net collateral",
        value: formatActionUsdBeforeAfter(beforeCollateral, afterCollateral),
      },
      {
        id: "health-factor",
        label: "Health factor",
        value: formatActionHealthFactor(healthAfter),
        tone: hfTone(healthAfter),
      },
    ],
    networkFeeLabel: formatActionNetworkFee(0.04),
    risk: riskFromPreview(preview, healthAfter),
    blockedReason: preview.allowed ? null : (preview.validationErrors[0] ?? "Action unavailable"),
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
  }
}

export function mapBorrowSupplyPreviewToActionUi(options: {
  allowed: boolean
  amountUsd: number
  symbol: string
  marketLabel: string
  borrowPowerUsd: number
  collateralFactorPct: number
  validationError?: string | null
}): ActionPreviewUi {
  return {
    allowed: options.allowed,
    amountLabel: formatActionAmount(options.amountUsd, options.symbol, 2),
    amountUsdLabel: formatActionApproxUsd(options.amountUsd),
    rateLabel: "Collateral factor",
    rateValue: formatActionPercent(options.collateralFactorPct),
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: "Borrow power",
    balanceValue: formatActionUsd(options.borrowPowerUsd),
    maxAmount: null,
    metrics: [
      {
        id: "borrow-power",
        label: "Borrowing power",
        value: formatActionUsd(options.borrowPowerUsd),
        tone: "positive",
      },
    ],
    networkFeeLabel: formatActionNetworkFee(0.04),
    risk: null,
    blockedReason: options.allowed ? null : (options.validationError ?? "Action unavailable"),
    validationErrors: options.validationError ? [options.validationError] : [],
    warnings: [],
  }
}

export function mapBorrowSuccessToActionUi(options: {
  title: string
  description: string
  receiptHash: string | null
  metrics: ActionPreviewUi["metrics"]
  href: string
}): ActionSuccessUi {
  return {
    title: options.title,
    description: options.description,
    receiptHash: options.receiptHash,
    metrics: options.metrics,
    primaryCtaLabel: "View borrow dashboard",
    primaryCtaHref: options.href,
    secondaryCtaLabel: "Done",
  }
}

export function mapLtvBeforeAfter(preview: TransactionPreview) {
  const before = formatActionRatioPercent(fixedToNumber(preview.before.currentLtvWad, 18))
  const after = formatActionRatioPercent(fixedToNumber(preview.after.currentLtvWad, 18))
  return `${before} → ${after}`
}
