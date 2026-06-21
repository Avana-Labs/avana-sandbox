import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"
import { formatActionApproxUsd, formatActionNetworkFee, formatActionUsd } from "@/app/lib/action-system/formatters"

export function mapRewardsClaimPreviewToActionUi(options: {
  allowed: boolean
  claimUsd: number
  marketLabel: string
  claimableTaskCount: number
  tokenBreakdown: Array<{ symbol: string; amount: number }>
  blockedReason?: string | null
}): ActionPreviewUi {
  const tokenRows = options.tokenBreakdown
    .filter((entry) => entry.amount > 0)
    .sort((left, right) => right.amount - left.amount)
    .map((entry) => ({
      id: `token-${entry.symbol.toLowerCase()}`,
      label: entry.symbol,
      value: formatActionUsd(entry.amount),
      tone: "positive" as const,
    }))

  return {
    allowed: options.allowed,
    amountLabel: "Rewards",
    amountUsdLabel: formatActionApproxUsd(options.claimUsd),
    rateLabel: "Claimable tasks",
    rateValue: String(options.claimableTaskCount),
    marketLabel: "Program",
    marketValue: options.marketLabel,
    balanceLabel: "Claimable",
    balanceValue: formatActionUsd(options.claimUsd),
    maxAmount: options.claimUsd,
    metrics: [
      {
        id: "points-claimed",
        label: "Points to claim",
        value: String(options.claimableTaskCount),
      },
      ...(tokenRows.length > 0
        ? tokenRows
        : [
            {
              id: "tokens-claimed",
              label: "Tokens to claim",
              value: formatActionUsd(options.claimUsd),
              tone: "positive" as const,
            },
          ]),
    ],
    networkFeeLabel: formatActionNetworkFee(0.02),
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
    networkFeeLabel: formatActionNetworkFee(0.02),
    risk: null,
    blockedReason: options.allowed ? null : (options.blockedReason ?? "Nothing to claim"),
    validationErrors: options.blockedReason ? [options.blockedReason] : [],
    warnings: [],
  }
}
