import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"
import { formatActionApproxUsd, formatActionNetworkFee, formatActionUsd } from "@/app/lib/action-system/formatters"

export function mapRewardsClaimPreviewToActionUi(options: {
  allowed: boolean
  claimUsd: number
  tokenLabel: string
  marketLabel: string
  blockedReason?: string | null
}): ActionPreviewUi {
  return {
    allowed: options.allowed,
    amountLabel: options.tokenLabel,
    amountUsdLabel: formatActionApproxUsd(options.claimUsd),
    rateLabel: "Rewards",
    rateValue: formatActionUsd(options.claimUsd),
    marketLabel: "Program",
    marketValue: options.marketLabel,
    balanceLabel: "Claimable",
    balanceValue: formatActionUsd(options.claimUsd),
    maxAmount: options.claimUsd,
    metrics: [
      {
        id: "claim-amount",
        label: "Claim amount",
        value: formatActionUsd(options.claimUsd),
        tone: "positive",
      },
    ],
    networkFeeLabel: formatActionNetworkFee(0.02),
    risk: null,
    blockedReason: options.allowed ? null : (options.blockedReason ?? "Nothing to claim"),
    validationErrors: options.blockedReason ? [options.blockedReason] : [],
    warnings: [],
  }
}
