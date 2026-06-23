const METRIC_TOOLTIPS_BY_ID: Record<string, string> = {
  exposure:
    "Total collateral value after leverage, including supplied assets and looped positions.",
  debt: "Outstanding borrowed amount you would owe after this transaction.",
  ltv: "Loan-to-value ratio — borrowed value divided by collateral value. Higher LTV means less buffer before liquidation.",
  hf: "Health factor estimates how far your position is from liquidation. Above 1.0 is solvent; below 1.0 can be liquidated.",
  "net-apy": "Estimated net yield after supply APY minus borrow cost for the looped position.",
  "liq-price": "Estimated collateral price at which your position could be liquidated.",
}

const METRIC_TOOLTIPS_BY_LABEL: Record<string, string> = {
  "Health factor": METRIC_TOOLTIPS_BY_ID.hf!,
  "Health factor after": METRIC_TOOLTIPS_BY_ID.hf!,
  LTV: METRIC_TOOLTIPS_BY_ID.ltv!,
  Exposure: METRIC_TOOLTIPS_BY_ID.exposure!,
  "Estimated debt": METRIC_TOOLTIPS_BY_ID.debt!,
  "Net APY": METRIC_TOOLTIPS_BY_ID["net-apy"]!,
  "Liquidation price": METRIC_TOOLTIPS_BY_ID["liq-price"]!,
  "Borrow APY": "Annualized cost to borrow this asset from the pool.",
  "Supply APY": "Annualized yield earned for supplying this asset to the pool.",
  "Borrow power": "Maximum additional value you can borrow before reaching the market LTV limit.",
  "Remaining debt": "Outstanding debt for this position that still needs to be repaid.",
  "Available to borrow": "Maximum additional borrow capacity based on your collateral and market limits.",
  "Network Fee": "Estimated gas cost to submit this transaction on-chain.",
}

export const ACTION_INFO_TOOLTIPS: Record<string, string> = {
  rate: "Estimated annual rate for this action, such as borrow APY, supply APY, or net carry.",
  market: "The market this action applies to, including collateral and borrow assets where relevant.",
  fee: "Estimated network (gas) fee required to confirm this transaction.",
  metric: "Projected change after this transaction completes.",
  amount: "Amount you are confirming for this transaction.",
  apy: "Annualized yield or cost rate for the selected market.",
}

export function resolveMetricTooltip(id?: string, label?: string, explicit?: string) {
  if (explicit) return explicit
  if (id && METRIC_TOOLTIPS_BY_ID[id]) return METRIC_TOOLTIPS_BY_ID[id]
  if (label && METRIC_TOOLTIPS_BY_LABEL[label]) return METRIC_TOOLTIPS_BY_LABEL[label]
  return ACTION_INFO_TOOLTIPS.metric
}
