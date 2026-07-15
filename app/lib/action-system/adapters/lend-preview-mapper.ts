import type { LendTransactionPreview } from "@/app/lib/lend-system/contracts"
import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"
import {
  formatActionApproxUsd,
  formatActionAmount,
  formatActionBeforeAfter,
  formatActionFeeSummary,
  formatActionRatioPercent,
  formatActionUsd,
  formatActionUsdBeforeAfter,
} from "@/app/lib/action-system/formatters"

function basePreviewFields(
  preview: LendTransactionPreview,
  options: {
    symbol: string
    amount: number
    marketLabel: string
    balanceLabel: string
    balanceAmount: number
    rateLabel: string
    rateValue: string
    amountUsd: number
    maxAmount?: number
  },
): Pick<
  ActionPreviewUi,
  | "allowed"
  | "amountLabel"
  | "amountUsd"
  | "amountUsdLabel"
  | "rateLabel"
  | "rateValue"
  | "marketLabel"
  | "marketValue"
  | "balanceLabel"
  | "balanceValue"
  | "maxAmount"
  | "networkFeeLabel"
  | "blockedReason"
  | "validationErrors"
  | "warnings"
> {
  return {
    allowed: preview.allowed,
    amountLabel: formatActionAmount(options.amount, options.symbol, 4),
    amountUsd: options.amountUsd,
    amountUsdLabel: formatActionApproxUsd(options.amountUsd),
    rateLabel: options.rateLabel,
    rateValue: options.rateValue,
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: options.balanceLabel,
    balanceValue: formatActionAmount(options.balanceAmount, options.symbol, 4),
    maxAmount: options.maxAmount ?? options.balanceAmount,
    networkFeeLabel: formatActionFeeSummary(options.amountUsd, 0.03),
    blockedReason: preview.allowed ? null : (preview.validationErrors[0] ?? "Action unavailable"),
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
  }
}

export function mapLendDepositPreviewToActionUi(
  preview: LendTransactionPreview,
  options: {
    symbol: string
    amount: number
    marketLabel: string
    balanceAmount: number
    rewardsApy: number
    assetPriceUsd?: number
  },
): ActionPreviewUi {
  const beforeSupplied = options.assetPriceUsd
    ? preview.before.suppliedAmount * options.assetPriceUsd
    : preview.before.suppliedValueUsd
  const afterSupplied = options.assetPriceUsd
    ? preview.after.suppliedAmount * options.assetPriceUsd
    : preview.after.suppliedValueUsd
  const beforeApy = preview.before.currentApy
  const afterApy = preview.after.currentApy
  const afterEarned = options.assetPriceUsd
    ? preview.after.interestEarned * options.assetPriceUsd + preview.after.rewardsEarnedUsd
    : preview.after.totalEarnedUsd
  const beforeRewards = preview.before.rewardsEarnedUsd
  const afterRewards = preview.after.rewardsEarnedUsd

  return {
    ...basePreviewFields(preview, {
      symbol: options.symbol,
      amount: options.amount,
      marketLabel: options.marketLabel,
      balanceLabel: "Balance",
      balanceAmount: options.balanceAmount,
      rateLabel: "Deposit APY",
      rateValue: formatActionRatioPercent(afterApy),
      amountUsd: Math.max(0, afterSupplied - beforeSupplied),
    }),
    metrics: [
      {
        id: "supplied-value",
        label: "Supplied value",
        value: formatActionUsdBeforeAfter(beforeSupplied, afterSupplied),
        before: formatActionUsd(beforeSupplied),
        after: formatActionUsd(afterSupplied),
      },
      {
        id: "apy",
        label: "APY",
        value: formatActionBeforeAfter(formatActionRatioPercent(beforeApy), formatActionRatioPercent(afterApy)),
        before: formatActionRatioPercent(beforeApy),
        after: formatActionRatioPercent(afterApy),
      },
      {
        id: "rewards",
        label: "Rewards APY",
        value: options.rewardsApy > 0 ? formatActionRatioPercent(options.rewardsApy) : "No rewards",
      },
      {
        id: "rewards-earned",
        label: "Rewards earned",
        value: formatActionUsdBeforeAfter(beforeRewards, afterRewards),
        before: formatActionUsd(beforeRewards),
        after: formatActionUsd(afterRewards),
      },
      {
        id: "total-earned",
        label: "Lifetime earnings",
        value: formatActionUsd(afterEarned, { exact: true }),
      },
    ],
    risk: null,
  }
}

export function mapLendWithdrawPreviewToActionUi(
  preview: LendTransactionPreview,
  options: {
    symbol: string
    amount: number
    marketLabel: string
    balanceAmount: number
    assetPriceUsd?: number
    poolAvailableLiquidity?: number
  },
): ActionPreviewUi {
  const beforeSupplied = options.assetPriceUsd
    ? preview.before.suppliedAmount * options.assetPriceUsd
    : preview.before.suppliedValueUsd
  const afterSupplied = options.assetPriceUsd
    ? preview.after.suppliedAmount * options.assetPriceUsd
    : preview.after.suppliedValueUsd
  const beforeApy = preview.before.currentApy
  const afterApy = preview.after.currentApy
  const beforeEarned = options.assetPriceUsd
    ? preview.before.interestEarned * options.assetPriceUsd + preview.before.rewardsEarnedUsd
    : preview.before.totalEarnedUsd
  const afterEarned = options.assetPriceUsd
    ? preview.after.interestEarned * options.assetPriceUsd + preview.after.rewardsEarnedUsd
    : preview.after.totalEarnedUsd
  const maxWithdrawable = preview.maxWithdrawable ?? options.balanceAmount

  return {
    ...basePreviewFields(preview, {
      symbol: options.symbol,
      amount: options.amount,
      marketLabel: options.marketLabel,
      balanceLabel: "Deposited",
      balanceAmount: options.balanceAmount,
      rateLabel: "Remaining supply",
      rateValue: formatActionUsd(afterSupplied),
      amountUsd: Math.max(0, beforeSupplied - afterSupplied),
      maxAmount: maxWithdrawable,
    }),
    metrics: [
      {
        id: "supplied-remaining",
        label: "Supplied remaining",
        value: formatActionUsdBeforeAfter(beforeSupplied, afterSupplied),
        before: formatActionUsd(beforeSupplied),
        after: formatActionUsd(afterSupplied),
      },
      {
        id: "apy-impact",
        label: "APY impact",
        value: formatActionBeforeAfter(formatActionRatioPercent(beforeApy), formatActionRatioPercent(afterApy)),
        before: formatActionRatioPercent(beforeApy),
        after: formatActionRatioPercent(afterApy),
      },
      {
        id: "earnings",
        label: "Accrued earnings",
        value: formatActionUsdBeforeAfter(beforeEarned, afterEarned),
        before: formatActionUsd(beforeEarned),
        after: formatActionUsd(afterEarned),
      },
      {
        id: "withdrawable-balance",
        label: "Wallet withdrawable",
        value: formatActionAmount(maxWithdrawable, options.symbol, 4),
      },
      ...(options.poolAvailableLiquidity != null
        ? [
            {
              id: "pool-liquidity",
              label: "Pool liquidity",
              value: formatActionAmount(options.poolAvailableLiquidity, options.symbol, 4),
            },
          ]
        : []),
      {
        id: "interest-inclusion",
        label: "Accrued interest",
        value: "Included in supplied balance",
      },
    ],
    risk: null,
  }
}

/** @deprecated Use mapLendDepositPreviewToActionUi or mapLendWithdrawPreviewToActionUi */
export function mapLendPreviewToActionUi(
  preview: LendTransactionPreview,
  options: {
    symbol: string
    amount: number
    marketLabel: string
    balanceLabel: string
    balanceAmount: number
    rateLabel: string
  },
): ActionPreviewUi {
  if (options.rateLabel === "Withdrawal") {
    return mapLendWithdrawPreviewToActionUi(preview, options)
  }
  return mapLendDepositPreviewToActionUi(preview, { ...options, rewardsApy: 0 })
}
