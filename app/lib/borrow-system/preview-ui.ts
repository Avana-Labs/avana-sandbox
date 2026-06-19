import { formatFixed } from "@/app/lib/credit-engine"
import type { TransactionPreview } from "./contracts"
import type { ActionBoxMetricRow, ActionBoxPreviewUi } from "./action-box-contract"

function metricRow(label: string, before: bigint, after: bigint, decimals: number, tone?: ActionBoxMetricRow["tone"]): ActionBoxMetricRow {
  return {
    label,
    value: `${formatFixed(before, decimals)} → ${formatFixed(after, decimals)}`,
    tone,
  }
}

function healthFactorRow(before: bigint | null, after: bigint | null): ActionBoxMetricRow {
  const format = (value: bigint | null) => (value == null ? "∞" : formatFixed(value, 18))
  const tone =
    after != null && after < 10n ** 18n ? "danger" : after != null && after < 15n * 10n ** 17n ? "warning" : "positive"
  return {
    label: "Health factor",
    value: `${format(before)} → ${format(after)}`,
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
