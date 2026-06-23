import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"
import { formatActionApproxUsd, formatActionFeeSummary, formatActionUsd } from "@/app/lib/action-system/formatters"

function formatTokenRewardAmount(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

export function mapRewardsClaimPreviewToActionUi(options: {
  allowed: boolean
  claimUsd: number
  marketLabel: string
  claimableTaskCount: number
  tokenBreakdown: Array<{ symbol: string; amount: number }>
  blockedReason?: string | null
}): ActionPreviewUi {
  const questLabel = options.claimableTaskCount === 1 ? "quest" : "quests"

  return {
    allowed: options.allowed,
    amountLabel: "AVA",
    amountUsdLabel: formatActionApproxUsd(options.claimUsd),
    rateLabel: "Ready to claim",
    rateValue: `${options.claimableTaskCount} ${questLabel}`,
    marketLabel: "Program",
    marketValue: "",
    balanceLabel: "Claimable",
    balanceValue: `${formatTokenRewardAmount(options.claimUsd)} AVA`,
    maxAmount: options.claimUsd,
    metrics: [],
    networkFeeLabel: formatActionFeeSummary(options.claimUsd, 0.02),
    risk: null,
    blockedReason: options.allowed ? null : (options.blockedReason ?? "Nothing to claim"),
    validationErrors: options.blockedReason ? [options.blockedReason] : [],
    warnings: [],
  }
}

/** Borrow-side fee/reward claim rows (per-token breakdown from collateral rewards). */
export function mapBorrowRewardsClaimPreviewToActionUi(options: {
  allowed: boolean
  claimUsd: number
  marketLabel: string
  tokenTotals: Record<string, number>
  blockedReason?: string | null
}): ActionPreviewUi {
  const tokenRows = Object.entries(options.tokenTotals)
    .filter(([, usd]) => usd > 0)
    .sort((left, right) => right[1] - left[1])
    .map(([symbol, usd]) => ({
      id: `claim-${symbol.toLowerCase()}`,
      label: symbol,
      value: formatActionUsd(usd),
      tone: "positive" as const,
    }))

  return {
    allowed: options.allowed,
    amountLabel: "Rewards",
    amountUsdLabel: formatActionApproxUsd(options.claimUsd),
    rateLabel: "Claim total",
    rateValue: formatActionUsd(options.claimUsd),
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: "Claimable",
    balanceValue: formatActionUsd(options.claimUsd),
    maxAmount: options.claimUsd,
    metrics:
      tokenRows.length > 0
        ? tokenRows
        : [
            {
              id: "claim-total",
              label: "Total received",
              value: formatActionUsd(options.claimUsd),
              tone: "positive" as const,
            },
          ],
    networkFeeLabel: formatActionFeeSummary(options.claimUsd, 0.02),
    risk: null,
    blockedReason: options.allowed ? null : (options.blockedReason ?? "Nothing to claim"),
    validationErrors: options.blockedReason ? [options.blockedReason] : [],
    warnings: [],
  }
}
