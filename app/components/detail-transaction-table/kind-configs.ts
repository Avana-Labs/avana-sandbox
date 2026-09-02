import type { DetailTransactionRow } from "@/app/lib/detail-page/transaction-history"

export type TransactionKindConfig = {
  labels: Record<string, string>
  tones: Record<string, string>
  describeFor?: (row: DetailTransactionRow, context: Record<string, string>) => string
}

const INFLOW_TONE = "text-success"
const OUTFLOW_TONE = "text-rose-600 dark:text-rose-400"
const NEUTRAL_TONE = "text-muted-foreground"
const WARNING_TONE = "text-amber-600 dark:text-amber-400"

export const LEND_KIND_CONFIG: TransactionKindConfig = {
  labels: {
    supply: "Supply",
    withdraw: "Withdraw",
    rewards: "Rewards",
  },
  tones: {
    supply: INFLOW_TONE,
    withdraw: OUTFLOW_TONE,
    rewards: INFLOW_TONE,
  },
  describeFor: (row, { assetSymbol }) => {
    if (row.tokenSymbol && row.tokenAmountLabel) return `${row.tokenAmountLabel} ${row.tokenSymbol}`
    return `${assetSymbol} market`
  },
}

export const BORROW_ASSET_KIND_CONFIG: TransactionKindConfig = {
  labels: {
    supply: "Supply",
    withdraw: "Withdraw",
    borrow: "Borrow",
    repay: "Repay",
    rewards: "Rewards",
    liquidation: "Liquidation",
  },
  tones: {
    supply: INFLOW_TONE,
    withdraw: OUTFLOW_TONE,
    borrow: OUTFLOW_TONE,
    repay: INFLOW_TONE,
    rewards: INFLOW_TONE,
    liquidation: WARNING_TONE,
  },
  describeFor: (row, { assetSymbol }) => {
    if (row.tokenSymbol && row.tokenAmountLabel) return `${row.tokenAmountLabel} ${row.tokenSymbol}`
    return `${assetSymbol} market`
  },
}

export const BORROW_POOL_KIND_CONFIG: TransactionKindConfig = {
  labels: {
    supply: "Pledge",
    withdraw: "Remove",
    borrow: "Borrow",
    repay: "Repay",
    rewards: "Claim",
    liquidation: "Liquidation",
  },
  tones: {
    supply: INFLOW_TONE,
    withdraw: OUTFLOW_TONE,
    borrow: OUTFLOW_TONE,
    repay: INFLOW_TONE,
    rewards: INFLOW_TONE,
    liquidation: WARNING_TONE,
  },
}

export const MULTIPLY_KIND_CONFIG: TransactionKindConfig = {
  labels: {
    open: "Open",
    add: "Add collateral",
    reduce: "Reduce",
    close: "Close",
    interest: "Interest",
    rebalance: "Rebalance",
  },
  tones: {
    open: INFLOW_TONE,
    add: INFLOW_TONE,
    reduce: OUTFLOW_TONE,
    close: OUTFLOW_TONE,
    interest: NEUTRAL_TONE,
    rebalance: WARNING_TONE,
  },
  describeFor: (row, { collateralSymbol, borrowableSymbol }) => {
    if (row.tokenSymbol && row.tokenAmountLabel) {
      return row.tokenSymbolSecondary
        ? `${row.tokenAmountLabel} ${row.tokenSymbol}`
        : `${row.tokenAmountLabel} ${row.tokenSymbol}`
    }
    return `${collateralSymbol}/${borrowableSymbol}`
  },
}

export type DetailTransactionPreset = "standard" | "pool"

export const PRESET_COLUMNS: Record<
  DetailTransactionPreset,
  Array<{ id: "time" | "type" | "amount" | "for" | "wallet"; label: string; align?: "left" | "right" }>
> = {
  standard: [
    { id: "time", label: "Time" },
    { id: "type", label: "Type" },
    { id: "amount", label: "Amount", align: "right" },
    { id: "for", label: "For", align: "right" },
    { id: "wallet", label: "Wallet", align: "right" },
  ],
  pool: [
    { id: "time", label: "Time" },
    { id: "type", label: "Type" },
    { id: "amount", label: "USD", align: "right" },
    { id: "wallet", label: "Wallet", align: "right" },
  ],
}
