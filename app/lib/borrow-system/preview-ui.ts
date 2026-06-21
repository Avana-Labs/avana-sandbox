import { formatFixed } from "@/app/lib/credit-engine"
import type { TransactionPreview } from "./contracts"
import type { ActionBoxMetricRow, ActionBoxPreviewUi } from "./action-box-contract"
import {
  formatActionHealthFactor,
  formatActionUsd,
  formatActionUsdBeforeAfter,
} from "@/app/lib/action-system/formatters"

function fixedToNumber(value: bigint, decimals: number) {
  return Number.parseFloat(formatFixed(value, decimals))
}

function metricRow(label: string, before: bigint, after: bigint, decimals: number, tone?: ActionBoxMetricRow["tone"]): ActionBoxMetricRow {
  if (decimals === 6) {
    return {
      label,
      value: formatActionUsdBeforeAfter(fixedToNumber(before, decimals), fixedToNumber(after, decimals)),
      tone,
    }
  }

  return {
    label,
    value: `${formatActionHealthFactor(fixedToNumber(before, decimals))} → ${formatActionHealthFactor(fixedToNumber(after, decimals))}`,
    tone,
  }
}

function healthFactorRow(before: bigint | null, after: bigint | null): ActionBoxMetricRow {
  const beforeValue = before == null ? null : fixedToNumber(before, 18)
  const afterValue = after == null ? null : fixedToNumber(after, 18)
  const tone =
    afterValue != null && afterValue < 1.05
      ? "danger"
      : afterValue != null && afterValue < 1.5
        ? "warning"
        : "positive"
  return {
    label: "Health factor",
    value: `${formatActionHealthFactor(beforeValue)} → ${formatActionHealthFactor(afterValue)}`,
    tone,
  }
}

export function mapPreviewToActionBoxUi(preview: TransactionPreview): ActionBoxPreviewUi {
  const blockedReason = preview.validationErrors[0] ?? null
  const rows: ActionBoxMetricRow[] = [
    metricRow("Collateral", preview.before.collateralValueUsd6, preview.after.collateralValueUsd6, 6),
    metricRow("Borrowed", preview.before.totalBorrowedUsd6, preview.after.totalBorrowedUsd6, 6),
    metricRow("Available credit", preview.before.availableBorrowCapacityUsd6, preview.after.availableBorrowCapacityUsd6, 6),
    healthFactorRow(preview.before.healthFactorWad, preview.after.healthFactorWad),
  ]

  return {
    allowed: preview.allowed,
    riskLabel: preview.riskLabel,
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
    rows,
    ctaLabel: preview.allowed ? "Continue" : (blockedReason ?? "Action unavailable"),
    blockedReason,
  }
}

export function formatPreviewUsd(value: bigint) {
  return formatActionUsd(fixedToNumber(value, 6))
}
