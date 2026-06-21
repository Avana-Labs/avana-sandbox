export type ActionProduct = "borrow" | "lend" | "multiply" | "rewards"

export type BorrowActionKind = "borrow" | "repay" | "supply" | "remove" | "claim"
export type LendActionKind = "deposit" | "withdraw"
export type MultiplyActionKind = "multiply" | "deleverage"
export type RewardsActionKind = "claim"

export type ActionKind =
  | BorrowActionKind
  | LendActionKind
  | MultiplyActionKind
  | RewardsActionKind

export type ActionPageMode = "page" | "overlay"

export type ActionStage =
  | "select"
  | "configure"
  | "approve_allowance"
  | "wallet_sign"
  | "processing"
  | "success"
  | "error"
  | "blocked"

export type ActionMetricTone = "default" | "positive" | "warning" | "danger"

export type ActionMetricRow = {
  id: string
  label: string
  value: string
  before?: string
  after?: string
  tone?: ActionMetricTone
  tooltip?: string
  tokenSymbols?: string[]
}

export type ActionRiskLevel = "safe" | "warning" | "danger"

export type ActionPreviewUi = {
  allowed: boolean
  amountLabel: string
  amountUsdLabel: string
  rateLabel: string
  rateValue: string
  marketLabel: string
  marketValue: string
  balanceLabel: string
  balanceValue: string
  maxAmount: number | null
  metrics: ActionMetricRow[]
  networkFeeLabel: string
  risk: {
    level: ActionRiskLevel
    title: string | null
    message: string | null
  } | null
  blockedReason: string | null
  validationErrors: string[]
  warnings: string[]
}

export type ActionSuccessUi = {
  title: string
  description: string
  receiptHash: string | null
  metrics: ActionMetricRow[]
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  receiptContext?: {
    verb: string
    amountLabel: string
    rateLabel: string
    rateValue: string
    marketValue: string
  }
}

export type ActionBlockedUi = {
  title: string
  description: string
  primaryCtaLabel: string | null
  primaryCtaHref: string | null
  secondaryCtaLabel: string
}

export type ActionPageDescriptor = {
  product: ActionProduct
  kind: ActionKind
  title: string
  subtitle: string
  primaryVerb: string
}

export const ACTION_DESCRIPTORS: Record<ActionProduct, Partial<Record<ActionKind, ActionPageDescriptor>>> = {
  borrow: {
    borrow: {
      product: "borrow",
      kind: "borrow",
      title: "Borrow",
      subtitle: "Configure and review your loan.",
      primaryVerb: "Borrow",
    },
    repay: {
      product: "borrow",
      kind: "repay",
      title: "Repay",
      subtitle: "Configure and review your repayment.",
      primaryVerb: "Repay",
    },
    supply: {
      product: "borrow",
      kind: "supply",
      title: "Deposit",
      subtitle: "Configure and review your deposit.",
      primaryVerb: "Deposit",
    },
    remove: {
      product: "borrow",
      kind: "remove",
      title: "Withdraw",
      subtitle: "Configure and review your withdrawal.",
      primaryVerb: "Withdraw",
    },
    claim: {
      product: "borrow",
      kind: "claim",
      title: "Claim",
      subtitle: "Configure and review your claim.",
      primaryVerb: "Claim",
    },
  },
  lend: {
    deposit: {
      product: "lend",
      kind: "deposit",
      title: "Deposit",
      subtitle: "Configure and review your deposit.",
      primaryVerb: "Deposit",
    },
    withdraw: {
      product: "lend",
      kind: "withdraw",
      title: "Withdraw",
      subtitle: "Configure and review your withdrawal.",
      primaryVerb: "Withdraw",
    },
  },
  multiply: {
    multiply: {
      product: "multiply",
      kind: "multiply",
      title: "Multiply",
      subtitle: "Configure and review your leverage.",
      primaryVerb: "Multiply",
    },
    deleverage: {
      product: "multiply",
      kind: "deleverage",
      title: "Deleverage",
      subtitle: "Configure and review your unwind.",
      primaryVerb: "Deleverage",
    },
  },
  rewards: {
    claim: {
      product: "rewards",
      kind: "claim",
      title: "Claim",
      subtitle: "Configure and review your rewards claim.",
      primaryVerb: "Claim",
    },
  },
}

export function getActionDescriptor(product: ActionProduct, kind: ActionKind): ActionPageDescriptor {
  const descriptor = ACTION_DESCRIPTORS[product][kind as keyof (typeof ACTION_DESCRIPTORS)[typeof product]]
  if (!descriptor) {
    throw new Error(`Unknown action ${product}/${kind}`)
  }
  return descriptor
}

export function actionPagePath(product: ActionProduct, kind: ActionKind, params?: Record<string, string>) {
  const search = params ? `?${new URLSearchParams(params).toString()}` : ""
  return `/actions/${product}/${kind}${search}`
}
