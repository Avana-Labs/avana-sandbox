export type HomeMode = "borrow" | "repay" | "claim" | "remove"

export type HomeAssetVisual = {
  symbol: string
  shortLabel: string
  bgClassName: string
  textClassName: string
}

export type HomeCollateralPool = {
  id: string
  name: string
  venue: string
  category: string
  collateralUsd: number
  maxLtv: number
  borrowPowerUsd: number
  liquidationUsd: number
  pairApr: number
  visuals: [HomeAssetVisual, HomeAssetVisual]
}

export type HomeBorrowToken = {
  id: string
  name: string
  symbol: string
  subtitle: string
  borrowApr: number
  visual: HomeAssetVisual
}

export type HomeClaimBreakdown = {
  id: string
  symbol: string
  amountLabel: string
  usdValue: number
  visual: HomeAssetVisual
}

export type HomeClaimPosition = {
  id: string
  poolId: string
  name: string
  subtitle: string
  totalUsd: number
  breakdown: HomeClaimBreakdown[]
}

export type HomeSuccessRowTone = "default" | "positive" | "warning" | "danger"

export type HomeSuccessRow = {
  label: string
  value: string
  tone?: HomeSuccessRowTone
}

export type HomeRiskTone = "neutral" | "positive" | "warning" | "danger"

export type BorrowPreview = {
  amountUsd: number
  amountLabel: string
  isEmpty: boolean
  isValid: boolean
  exceedsBorrowPower: boolean
  healthFactor: number | null
  healthFactorLabel: string
  riskTone: HomeRiskTone
  progressPercent: number
  remainingBorrowPowerUsd: number
  warningTitle: string | null
  warningMessage: string | null
  ctaLabel: string
}

export type RepayPreview = {
  amountUsd: number
  isEmpty: boolean
  isValid: boolean
  exceedsDebt: boolean
  remainingDebtUsd: number
  remainingDebtLabel: string
  healthFactorAfter: number | null
  healthFactorAfterLabel: string
  oldHealthFactorLabel: string
  riskTone: HomeRiskTone
  yearlyInterestSavedUsd: number
  ctaLabel: string
}

export type ClaimPreview = {
  selectedPositionIds: string[]
  selectedTotalUsd: number
  effectiveClaimUsd: number
  hasSelection: boolean
  hasCustomAmount: boolean
  ctaLabel: string
  helperLabel: string
  tokenTotals: Record<string, number>
}

export type RemovePreview = {
  percent: number
  safePercent: number
  removeUsd: number
  afterCollateralUsd: number
  healthFactorAfter: number | null
  healthFactorAfterLabel: string
  riskTone: HomeRiskTone
  isUnsafe: boolean
  liquidationThresholdAfterUsd: number
  ctaLabel: string
}

export const HOME_PORTFOLIO_SUMMARY = {
  totalCollateralUsd: 14_400,
  dailyChangeUsd: 340,
  borrowedUsd: 1_200,
  availableUsd: 8_880,
  averageHealthFactor: 2.3,
  chartSeed: "lpfi-home-root",
}

export const HOME_COLLATERAL_POOLS: HomeCollateralPool[] = [
  {
    id: "eth-usdc",
    name: "ETH / USDC",
    venue: "Uni v3 Bluechip",
    category: "Bluechip Spoke",
    collateralUsd: 4_200,
    maxLtv: 70,
    borrowPowerUsd: 2_940,
    liquidationUsd: 3_380,
    pairApr: 8.7,
    visuals: [
      { symbol: "ETH", shortLabel: "ETH", bgClassName: "bg-indigo-100", textClassName: "text-indigo-600" },
      { symbol: "USDC", shortLabel: "U", bgClassName: "bg-sky-100", textClassName: "text-sky-700" },
    ],
  },
  {
    id: "wbtc-eth",
    name: "WBTC / ETH",
    venue: "Uni v3 Bluechip",
    category: "Bluechip Spoke",
    collateralUsd: 2_100,
    maxLtv: 67,
    borrowPowerUsd: 1_407,
    liquidationUsd: 1_700,
    pairApr: 6.2,
    visuals: [
      { symbol: "WBTC", shortLabel: "BTC", bgClassName: "bg-amber-100", textClassName: "text-amber-700" },
      { symbol: "ETH", shortLabel: "ETH", bgClassName: "bg-indigo-100", textClassName: "text-indigo-600" },
    ],
  },
  {
    id: "usdc-usdt",
    name: "USDC / USDT",
    venue: "Uni v3 Stable",
    category: "Stable Spoke",
    collateralUsd: 8_100,
    maxLtv: 78,
    borrowPowerUsd: 6_318,
    liquidationUsd: 6_560,
    pairApr: 3.2,
    visuals: [
      { symbol: "USDC", shortLabel: "U", bgClassName: "bg-sky-100", textClassName: "text-sky-700" },
      { symbol: "USDT", shortLabel: "T", bgClassName: "bg-emerald-100", textClassName: "text-emerald-700" },
    ],
  },
]

export const HOME_BORROW_TOKENS: HomeBorrowToken[] = [
  {
    id: "eth",
    name: "Ethereum",
    symbol: "ETH",
    subtitle: "Native asset",
    borrowApr: 4.1,
    visual: { symbol: "ETH", shortLabel: "ETH", bgClassName: "bg-indigo-100", textClassName: "text-indigo-600" },
  },
  {
    id: "usdc",
    name: "USD Coin",
    symbol: "USDC",
    subtitle: "Stablecoin",
    borrowApr: 5.2,
    visual: { symbol: "USDC", shortLabel: "U", bgClassName: "bg-sky-100", textClassName: "text-sky-700" },
  },
  {
    id: "usdt",
    name: "Tether",
    symbol: "USDT",
    subtitle: "Stablecoin",
    borrowApr: 4.8,
    visual: { symbol: "USDT", shortLabel: "T", bgClassName: "bg-emerald-100", textClassName: "text-emerald-700" },
  },
  {
    id: "wbtc",
    name: "Wrapped Bitcoin",
    symbol: "WBTC",
    subtitle: "Bitcoin",
    borrowApr: 2.9,
    visual: { symbol: "WBTC", shortLabel: "BTC", bgClassName: "bg-amber-100", textClassName: "text-amber-700" },
  },
  {
    id: "weth",
    name: "Wrapped Ether",
    symbol: "WETH",
    subtitle: "Wrapped native",
    borrowApr: 4.0,
    visual: { symbol: "WETH", shortLabel: "W", bgClassName: "bg-muted", textClassName: "text-foreground" },
  },
  {
    id: "dai",
    name: "Dai",
    symbol: "DAI",
    subtitle: "MakerDAO stablecoin",
    borrowApr: 5.7,
    visual: { symbol: "DAI", shortLabel: "D", bgClassName: "bg-orange-100", textClassName: "text-orange-700" },
  },
  {
    id: "gho",
    name: "GHO",
    symbol: "GHO",
    subtitle: "Aave stablecoin",
    borrowApr: 3.9,
    visual: { symbol: "GHO", shortLabel: "G", bgClassName: "bg-violet-100", textClassName: "text-violet-700" },
  },
  {
    id: "link",
    name: "Chainlink",
    symbol: "LINK",
    subtitle: "Oracle network",
    borrowApr: 3.2,
    visual: { symbol: "LINK", shortLabel: "L", bgClassName: "bg-blue-100", textClassName: "text-blue-700" },
  },
  {
    id: "uni",
    name: "Uniswap",
    symbol: "UNI",
    subtitle: "Governance",
    borrowApr: 3.5,
    visual: { symbol: "UNI", shortLabel: "U", bgClassName: "bg-pink-100", textClassName: "text-pink-700" },
  },
  {
    id: "aave",
    name: "Aave",
    symbol: "AAVE",
    subtitle: "Governance",
    borrowApr: 2.8,
    visual: { symbol: "AAVE", shortLabel: "A", bgClassName: "bg-purple-100", textClassName: "text-purple-700" },
  },
  {
    id: "arb",
    name: "Arbitrum",
    symbol: "ARB",
    subtitle: "L2 governance",
    borrowApr: 3.1,
    visual: { symbol: "ARB", shortLabel: "A", bgClassName: "bg-cyan-100", textClassName: "text-cyan-700" },
  },
  {
    id: "op",
    name: "Optimism",
    symbol: "OP",
    subtitle: "L2 governance",
    borrowApr: 3.0,
    visual: { symbol: "OP", shortLabel: "O", bgClassName: "bg-rose-100", textClassName: "text-rose-700" },
  },
  {
    id: "ldo",
    name: "Lido DAO",
    symbol: "LDO",
    subtitle: "Liquid staking",
    borrowApr: 4.4,
    visual: { symbol: "LDO", shortLabel: "L", bgClassName: "bg-sky-100", textClassName: "text-sky-700" },
  },
  {
    id: "mkr",
    name: "Maker",
    symbol: "MKR",
    subtitle: "Governance",
    borrowApr: 3.7,
    visual: { symbol: "MKR", shortLabel: "M", bgClassName: "bg-teal-100", textClassName: "text-teal-700" },
  },
]

export const HOME_CLAIM_POSITIONS: HomeClaimPosition[] = [
  {
    id: "claim-eth-usdc",
    poolId: "eth-usdc",
    name: "ETH / USDC",
    subtitle: "Uni v3 · Bluechip · 0.3%",
    totalUsd: 142,
    breakdown: [
      {
        id: "claim-eth-usdc-eth",
        symbol: "ETH",
        amountLabel: "0.0210 ETH",
        usdValue: 68.99,
        visual: { symbol: "ETH", shortLabel: "ETH", bgClassName: "bg-indigo-100", textClassName: "text-indigo-600" },
      },
      {
        id: "claim-eth-usdc-usdc",
        symbol: "USDC",
        amountLabel: "42.11 USDC",
        usdValue: 42.11,
        visual: { symbol: "USDC", shortLabel: "U", bgClassName: "bg-sky-100", textClassName: "text-sky-700" },
      },
      {
        id: "claim-eth-usdc-fees",
        symbol: "Fees",
        amountLabel: "$30.90 fees",
        usdValue: 30.9,
        visual: { symbol: "Fees", shortLabel: "F", bgClassName: "bg-amber-100", textClassName: "text-amber-700" },
      },
    ],
  },
  {
    id: "claim-usdc-usdt",
    poolId: "usdc-usdt",
    name: "USDC / USDT",
    subtitle: "Uni v3 · Stable · 0.01%",
    totalUsd: 62.4,
    breakdown: [
      {
        id: "claim-usdc-usdt-usdc",
        symbol: "USDC",
        amountLabel: "42.11 USDC",
        usdValue: 42.11,
        visual: { symbol: "USDC", shortLabel: "U", bgClassName: "bg-sky-100", textClassName: "text-sky-700" },
      },
      {
        id: "claim-usdc-usdt-usdt",
        symbol: "USDT",
        amountLabel: "20.29 USDT",
        usdValue: 20.29,
        visual: { symbol: "USDT", shortLabel: "T", bgClassName: "bg-emerald-100", textClassName: "text-emerald-700" },
      },
    ],
  },
  {
    id: "claim-wbtc-eth",
    poolId: "wbtc-eth",
    name: "WBTC / ETH",
    subtitle: "Uni v3 · Bluechip · 0.3%",
    totalUsd: 79.6,
    breakdown: [
      {
        id: "claim-wbtc-eth-wbtc",
        symbol: "WBTC",
        amountLabel: "0.0011 WBTC",
        usdValue: 48.1,
        visual: { symbol: "WBTC", shortLabel: "BTC", bgClassName: "bg-amber-100", textClassName: "text-amber-700" },
      },
      {
        id: "claim-wbtc-eth-eth",
        symbol: "ETH",
        amountLabel: "0.0094 ETH",
        usdValue: 31.5,
        visual: { symbol: "ETH", shortLabel: "ETH", bgClassName: "bg-indigo-100", textClassName: "text-indigo-600" },
      },
    ],
  },
]

export const HOME_INITIAL_DEBTS: Record<string, number> = {
  "eth-usdc": 1_200,
  "usdc-usdt": 800,
  "wbtc-eth": 0,
}

export const HOME_INITIAL_CLAIM_SELECTIONS: Record<string, boolean> = {
  "claim-eth-usdc": true,
  "claim-usdc-usdt": true,
  "claim-wbtc-eth": false,
}

export const HOME_INITIAL_CLAIMABLE_TOTALS: Record<string, number> = Object.fromEntries(
  HOME_CLAIM_POSITIONS.map((position) => [position.id, position.totalUsd]),
)

export const HOME_DEFAULT_SELECTIONS = {
  borrowPoolId: "eth-usdc",
  borrowTokenId: "usdc",
  repayPoolId: "eth-usdc",
  removePoolId: "eth-usdc",
  removePercent: 25,
}

export function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCompactUsd(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: value >= 100 ? 0 : 2 })}`
}

export function formatHealthFactor(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "—"
  }

  if (!Number.isFinite(value)) {
    return "∞"
  }

  return value.toFixed(2)
}

export function getPoolById(poolId: string) {
  return HOME_COLLATERAL_POOLS.find((pool) => pool.id === poolId) ?? HOME_COLLATERAL_POOLS[0]
}

export function getBorrowTokenById(tokenId: string) {
  return HOME_BORROW_TOKENS.find((token) => token.id === tokenId) ?? HOME_BORROW_TOKENS[0]
}

export function getClaimPositionById(positionId: string) {
  return HOME_CLAIM_POSITIONS.find((position) => position.id === positionId) ?? HOME_CLAIM_POSITIONS[0]
}

export function getRiskTone(healthFactor: number | null): HomeRiskTone {
  if (healthFactor === null || Number.isNaN(healthFactor)) {
    return "neutral"
  }

  if (!Number.isFinite(healthFactor) || healthFactor > 2) {
    return "positive"
  }

  if (healthFactor > 1.5) {
    return "warning"
  }

  return "danger"
}

export type HealthStatus = {
  label: string
  dotClass: string
  textClass: string
  barClass: string
}

export function getHealthStatus(hf: number): HealthStatus {
  if (!Number.isFinite(hf) || hf >= 2.5) {
    return { label: "SAFE", dotClass: "bg-emerald-500", textClass: "text-emerald-600", barClass: "bg-emerald-500" }
  }
  if (hf >= 1.75) {
    return { label: "GOOD", dotClass: "bg-yellow-400", textClass: "text-yellow-600", barClass: "bg-yellow-400" }
  }
  if (hf >= 1.2) {
    return { label: "WATCH", dotClass: "bg-orange-500", textClass: "text-orange-600", barClass: "bg-orange-500" }
  }
  return { label: "AT RISK", dotClass: "bg-rose-500", textClass: "text-rose-600", barClass: "bg-rose-500" }
}

export function healthGaugePercent(hf: number): number {
  if (!Number.isFinite(hf)) return 100
  const min = 1.0
  const max = 3.0
  const clamped = Math.max(min, Math.min(max, hf))
  return ((clamped - min) / (max - min)) * 100
}

export function healthFactorBarPct(hf: number | null): number {
  if (hf === null || Number.isNaN(hf)) return 0
  if (!Number.isFinite(hf)) return 100
  const min = 1.0
  const max = 5.0
  return Math.max(0, Math.min(100, ((hf - min) / (max - min)) * 100))
}

export const MAX_LTV = 0.8
export const LIQUIDATION_LTV = 0.83

export function calculateBorrowPreview(pool: HomeCollateralPool, amountUsd: number, tokenSymbol: string): BorrowPreview {
  if (amountUsd <= 0) {
    return {
      amountUsd,
      amountLabel: "—",
      isEmpty: true,
      isValid: false,
      exceedsBorrowPower: false,
      healthFactor: null,
      healthFactorLabel: "—",
      riskTone: "neutral",
      progressPercent: 5,
      remainingBorrowPowerUsd: pool.borrowPowerUsd,
      warningTitle: null,
      warningMessage: null,
      ctaLabel: "Enter an amount",
    }
  }

  const healthFactor = (pool.collateralUsd * (pool.maxLtv / 100)) / amountUsd
  const exceedsBorrowPower = amountUsd > pool.borrowPowerUsd
  const riskTone = getRiskTone(healthFactor)
  const progressPercent = Math.max(5, Math.min(90, 90 - (amountUsd / pool.borrowPowerUsd) * 85))
  const remainingBorrowPowerUsd = Math.max(0, pool.borrowPowerUsd - amountUsd)

  let warningTitle: string | null = null
  let warningMessage: string | null = null

  if (riskTone === "danger") {
    warningTitle = "High liquidation risk"
    warningMessage = `Health factor drops to ${formatHealthFactor(healthFactor)}. Consider borrowing less.`
  } else if (riskTone === "warning") {
    warningTitle = "Borrowing gets tighter"
    warningMessage = `Health factor would sit at ${formatHealthFactor(healthFactor)}.`
  }

  return {
    amountUsd,
    amountLabel: formatUsd(amountUsd),
    isEmpty: false,
    isValid: !exceedsBorrowPower,
    exceedsBorrowPower,
    healthFactor,
    healthFactorLabel: formatHealthFactor(healthFactor),
    riskTone,
    progressPercent,
    remainingBorrowPowerUsd,
    warningTitle,
    warningMessage,
    ctaLabel: exceedsBorrowPower ? "Exceeds borrow power" : `Borrow ${amountUsd.toFixed(0)} ${tokenSymbol}`,
  }
}

export function calculateRepayPreview(pool: HomeCollateralPool, currentDebtUsd: number, amountUsd: number, borrowApr: number): RepayPreview {
  if (amountUsd <= 0) {
    return {
      amountUsd,
      isEmpty: true,
      isValid: false,
      exceedsDebt: false,
      remainingDebtUsd: currentDebtUsd,
      remainingDebtLabel: formatCompactUsd(currentDebtUsd),
      healthFactorAfter: currentDebtUsd > 0 ? (pool.collateralUsd * (pool.maxLtv / 100)) / currentDebtUsd : Number.POSITIVE_INFINITY,
      healthFactorAfterLabel:
        currentDebtUsd > 0 ? formatHealthFactor((pool.collateralUsd * (pool.maxLtv / 100)) / currentDebtUsd) : "∞",
      oldHealthFactorLabel:
        currentDebtUsd > 0 ? formatHealthFactor((pool.collateralUsd * (pool.maxLtv / 100)) / currentDebtUsd) : "∞",
      riskTone: currentDebtUsd > 0 ? getRiskTone((pool.collateralUsd * (pool.maxLtv / 100)) / currentDebtUsd) : "positive",
      yearlyInterestSavedUsd: 0,
      ctaLabel: "Enter an amount",
    }
  }

  const remainingDebtUsd = Math.max(0, currentDebtUsd - amountUsd)
  const healthFactorAfter =
    remainingDebtUsd > 0 ? (pool.collateralUsd * (pool.maxLtv / 100)) / remainingDebtUsd : Number.POSITIVE_INFINITY
  const oldHealthFactor =
    currentDebtUsd > 0 ? (pool.collateralUsd * (pool.maxLtv / 100)) / currentDebtUsd : Number.POSITIVE_INFINITY
  const exceedsDebt = amountUsd > currentDebtUsd

  return {
    amountUsd,
    isEmpty: false,
    isValid: !exceedsDebt,
    exceedsDebt,
    remainingDebtUsd,
    remainingDebtLabel: `${formatCompactUsd(remainingDebtUsd)} USDC`,
    healthFactorAfter,
    healthFactorAfterLabel: formatHealthFactor(healthFactorAfter),
    oldHealthFactorLabel: formatHealthFactor(oldHealthFactor),
    riskTone: getRiskTone(healthFactorAfter),
    yearlyInterestSavedUsd: (amountUsd * borrowApr) / 100,
    ctaLabel: exceedsDebt ? "Exceeds debt" : `Repay ${formatCompactUsd(amountUsd)} USDC`,
  }
}

export function calculateClaimPreview(
  positions: HomeClaimPosition[],
  claimableTotals: Record<string, number>,
  selections: Record<string, boolean>,
  partialAmountUsd: number | null,
): ClaimPreview {
  const selectedPositionIds = positions.filter((position) => selections[position.id]).map((position) => position.id)
  const selectedTotalUsd = selectedPositionIds.reduce((sum, positionId) => sum + (claimableTotals[positionId] ?? 0), 0)
  const hasCustomAmount = partialAmountUsd !== null && partialAmountUsd > 0
  const effectiveClaimUsd = hasCustomAmount ? Math.min(partialAmountUsd ?? 0, selectedTotalUsd) : selectedTotalUsd
  const tokenTotals = positions.reduce<Record<string, number>>((accumulator, position) => {
    if (!selections[position.id]) {
      return accumulator
    }

    position.breakdown.forEach((item) => {
      if (item.symbol === "Fees") {
        return
      }

      accumulator[item.symbol] = (accumulator[item.symbol] ?? 0) + item.usdValue
    })

    return accumulator
  }, {})

  return {
    selectedPositionIds,
    selectedTotalUsd,
    effectiveClaimUsd,
    hasSelection: selectedPositionIds.length > 0,
    hasCustomAmount,
    ctaLabel:
      selectedPositionIds.length > 0 ? `Claim ${formatUsd(effectiveClaimUsd)} in fees` : "Select positions to claim",
    helperLabel: hasCustomAmount ? "Partial claim from selected positions" : "Leave empty to claim all selected",
    tokenTotals,
  }
}

export function calculateSafeRemovePercent(pool: HomeCollateralPool, currentDebtUsd: number) {
  if (currentDebtUsd <= 0) {
    return 100
  }

  return Math.max(0, Math.min(100, Math.floor((1 - currentDebtUsd / ((pool.collateralUsd * (pool.maxLtv / 100)) / 1.5)) * 100)))
}

export function calculateRemovePreview(pool: HomeCollateralPool, currentDebtUsd: number, percent: number): RemovePreview {
  const removeUsd = Math.round((pool.collateralUsd * percent) / 100)
  const afterCollateralUsd = pool.collateralUsd - removeUsd
  const healthFactorAfter =
    currentDebtUsd > 0 ? (afterCollateralUsd * (pool.maxLtv / 100)) / currentDebtUsd : Number.POSITIVE_INFINITY
  const safePercent = calculateSafeRemovePercent(pool, currentDebtUsd)
  const isUnsafe = currentDebtUsd > 0 && percent > safePercent

  return {
    percent,
    safePercent,
    removeUsd,
    afterCollateralUsd,
    healthFactorAfter,
    healthFactorAfterLabel: formatHealthFactor(healthFactorAfter),
    riskTone: getRiskTone(healthFactorAfter),
    isUnsafe,
    liquidationThresholdAfterUsd: Math.round(afterCollateralUsd * 0.805),
    ctaLabel: `Remove ${percent}% · ${formatCompactUsd(removeUsd)}`,
  }
}

export function getClaimBreakdownLabel(symbol: string, totalUsd: number) {
  switch (symbol) {
    case "ETH":
      return `${(totalUsd / 3_285.24).toFixed(4)} ETH`
    case "USDC":
      return `${totalUsd.toFixed(2)} USDC`
    case "USDT":
      return `${totalUsd.toFixed(2)} USDT`
    case "WBTC":
      return `${(totalUsd / 43_727.27).toFixed(4)} WBTC`
    default:
      return formatUsd(totalUsd)
  }
}
