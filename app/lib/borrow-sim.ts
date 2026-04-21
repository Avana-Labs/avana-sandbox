export type BorrowSpokeId = "stable" | "bluechip" | "open"

export type BorrowAssetVisual = {
  symbol: string
  shortLabel: string
  bgClass: string
  textClass: string
}

export type BorrowSpoke = {
  id: BorrowSpokeId
  label: string
  description: string
  maxLtv: number
  liquidityUsd: number
  dotClass: string
  pillBgClass: string
  pillTextClass: string
  aprApprox: number
  riskPremiumBps: number
  liquidationUsdApprox: number
}

export type DexChip = {
  id: string
  label: string
  starred?: boolean
}

export type BorrowPoolRow = {
  id: string
  name: string
  venue: string
  spoke: BorrowSpokeId
  ltv: number
  dexes: DexChip[]
  borrowableTokens: BorrowAssetVisual[]
  aprMin: number
  aprMax: number
  availableUsd: number
  riskPremiumBps: number
  visuals: [BorrowAssetVisual, BorrowAssetVisual]
  collateralExampleUsd: number
  trendUp: boolean
}

export type BorrowableAsset = {
  id: string
  symbol: string
  name: string
  subtitle: string
  borrowApr: number
  totalBorrowedUsd: number
  utilization: number
  availableUsd: number
  walletBalanceLabel: string
  hasWalletBalance: boolean
  visual: BorrowAssetVisual
  trendUp: boolean
}

export type PendingMarketRow = {
  id: string
  spoke: BorrowSpokeId
  label: string
  subLabel: string
}

export type BorrowSortDirection = "asc" | "desc"

export const BORROW_SPOKES: BorrowSpoke[] = [
  {
    id: "stable",
    label: "Stable Spoke",
    description: "Both assets stablecoin / GHO · Lowest risk · Oracle: virtual price + $1 peg",
    maxLtv: 78,
    liquidityUsd: 48_200_000,
    dotClass: "bg-emerald-500",
    pillBgClass: "bg-emerald-50",
    pillTextClass: "text-emerald-700",
    aprApprox: 3.9,
    riskPremiumBps: 35,
    liquidationUsdApprox: 2_088,
  },
  {
    id: "bluechip",
    label: "Bluechip Spoke",
    description: "Deep-liquid pairs with Chainlink support · Medium risk · Oracle: Chainlink + TWAP",
    maxLtv: 70,
    liquidityUsd: 76_400_000,
    dotClass: "bg-blue-500",
    pillBgClass: "bg-blue-50",
    pillTextClass: "text-blue-700",
    aprApprox: 5.2,
    riskPremiumBps: 70,
    liquidationUsdApprox: 3_380,
  },
  {
    id: "open",
    label: "Open Spoke",
    description: "Governance-whitelisted volatile pairs · Higher risk · 90-day trial · Auto-sunset below $20M",
    maxLtv: 55,
    liquidityUsd: 17_800_000,
    dotClass: "bg-amber-500",
    pillBgClass: "bg-amber-50",
    pillTextClass: "text-amber-700",
    aprApprox: 6.8,
    riskPremiumBps: 180,
    liquidationUsdApprox: 1_092,
  },
]

const VISUALS = {
  USDC: { symbol: "USDC", shortLabel: "U", bgClass: "bg-sky-100", textClass: "text-sky-700" },
  USDT: { symbol: "USDT", shortLabel: "T", bgClass: "bg-emerald-100", textClass: "text-emerald-700" },
  GHO: { symbol: "GHO", shortLabel: "G", bgClass: "bg-violet-100", textClass: "text-violet-700" },
  DAI: { symbol: "DAI", shortLabel: "D", bgClass: "bg-orange-100", textClass: "text-orange-700" },
  ETH: { symbol: "ETH", shortLabel: "E", bgClass: "bg-indigo-100", textClass: "text-indigo-700" },
  WBTC: { symbol: "WBTC", shortLabel: "B", bgClass: "bg-amber-100", textClass: "text-amber-700" },
  stETH: { symbol: "stETH", shortLabel: "st", bgClass: "bg-sky-100", textClass: "text-sky-600" },
  CRV3: { symbol: "3CRV", shortLabel: "3", bgClass: "bg-orange-100", textClass: "text-orange-700" },
  ARB: { symbol: "ARB", shortLabel: "A", bgClass: "bg-indigo-100", textClass: "text-indigo-600" },
  OP: { symbol: "OP", shortLabel: "O", bgClass: "bg-rose-100", textClass: "text-rose-600" },
} satisfies Record<string, BorrowAssetVisual>

export const BORROW_POOL_CATALOG: BorrowPoolRow[] = [
  {
    id: "usdc-usdt",
    name: "USDC / USDT",
    venue: "Uni v3 Stable · 0.01% fee",
    spoke: "stable",
    ltv: 78,
    dexes: [
      { id: "uv3", label: "Uni v3" },
      { id: "uv4", label: "Uni v4" },
      { id: "curve", label: "Curve" },
    ],
    borrowableTokens: [VISUALS.USDC, VISUALS.GHO, VISUALS.DAI],
    aprMin: 3.9,
    aprMax: 5.7,
    availableUsd: 18_400_000,
    riskPremiumBps: 35,
    visuals: [VISUALS.USDC, VISUALS.USDT],
    collateralExampleUsd: 8_100,
    trendUp: true,
  },
  {
    id: "gho-usdc",
    name: "GHO / USDC",
    venue: "Uni v3/v4 · GHO native pools",
    spoke: "stable",
    ltv: 80,
    dexes: [
      { id: "uv3", label: "Uni v3" },
      { id: "uv4", label: "Uni v4", starred: true },
      { id: "curve", label: "Curve" },
    ],
    borrowableTokens: [VISUALS.GHO, VISUALS.USDC],
    aprMin: 2.9,
    aprMax: 5.2,
    availableUsd: 22_100_000,
    riskPremiumBps: 30,
    visuals: [VISUALS.GHO, VISUALS.USDC],
    collateralExampleUsd: 2_250,
    trendUp: true,
  },
  {
    id: "curve-3pool",
    name: "Curve 3Pool",
    venue: "USDC/USDT/DAI · Virtual price oracle",
    spoke: "stable",
    ltv: 76,
    dexes: [
      { id: "curve", label: "Curve" },
      { id: "crvusd", label: "crvUSD" },
    ],
    borrowableTokens: [VISUALS.USDC, VISUALS.USDT, VISUALS.DAI],
    aprMin: 3.9,
    aprMax: 5.7,
    availableUsd: 7_700_000,
    riskPremiumBps: 40,
    visuals: [VISUALS.CRV3, VISUALS.USDC],
    collateralExampleUsd: 8_100,
    trendUp: false,
  },
  {
    id: "eth-usdc",
    name: "ETH / USDC",
    venue: "Uni v3 · 0.3% · In range",
    spoke: "bluechip",
    ltv: 70,
    dexes: [
      { id: "uv3", label: "Uni v3" },
      { id: "uv4", label: "Uni v4" },
      { id: "bal", label: "Balancer" },
    ],
    borrowableTokens: [VISUALS.USDC, VISUALS.GHO, VISUALS.ETH],
    aprMin: 4.1,
    aprMax: 5.7,
    availableUsd: 28_600_000,
    riskPremiumBps: 70,
    visuals: [VISUALS.ETH, VISUALS.USDC],
    collateralExampleUsd: 4_200,
    trendUp: true,
  },
  {
    id: "steth-eth",
    name: "stETH / ETH",
    venue: "Curve + Balancer · Correlated pair",
    spoke: "bluechip",
    ltv: 72,
    dexes: [
      { id: "curve", label: "Curve" },
      { id: "bal", label: "Balancer" },
      { id: "uv3", label: "Uni v3" },
    ],
    borrowableTokens: [VISUALS.USDC, VISUALS.ETH],
    aprMin: 3.8,
    aprMax: 5.2,
    availableUsd: 31_200_000,
    riskPremiumBps: 55,
    visuals: [VISUALS.ETH, VISUALS.stETH],
    collateralExampleUsd: 3_100,
    trendUp: true,
  },
  {
    id: "wbtc-eth",
    name: "WBTC / ETH",
    venue: "Uni v3 · 0.3% · Volatile pair",
    spoke: "bluechip",
    ltv: 67,
    dexes: [
      { id: "uv3", label: "Uni v3" },
      { id: "bal", label: "Balancer" },
    ],
    borrowableTokens: [VISUALS.USDC, VISUALS.GHO],
    aprMin: 4.8,
    aprMax: 5.7,
    availableUsd: 16_600_000,
    riskPremiumBps: 85,
    visuals: [VISUALS.WBTC, VISUALS.ETH],
    collateralExampleUsd: 2_100,
    trendUp: false,
  },
  {
    id: "usdc-arb",
    name: "USDC / ARB",
    venue: "Camelot · Arbitrum · Trial 90d",
    spoke: "open",
    ltv: 52,
    dexes: [{ id: "cam", label: "Camelot" }],
    borrowableTokens: [VISUALS.USDC],
    aprMin: 6.8,
    aprMax: 6.8,
    availableUsd: 9_200_000,
    riskPremiumBps: 180,
    visuals: [VISUALS.USDC, VISUALS.ARB],
    collateralExampleUsd: 1_800,
    trendUp: false,
  },
  {
    id: "eth-op",
    name: "ETH / OP",
    venue: "Velodrome · Optimism · Trial 90d",
    spoke: "open",
    ltv: 50,
    dexes: [{ id: "vel", label: "Velodrome" }],
    borrowableTokens: [VISUALS.USDC, VISUALS.ETH],
    aprMin: 7.4,
    aprMax: 7.4,
    availableUsd: 8_600_000,
    riskPremiumBps: 210,
    visuals: [VISUALS.ETH, VISUALS.OP],
    collateralExampleUsd: 1_400,
    trendUp: false,
  },
]

export const BORROW_PENDING_ROWS: PendingMarketRow[] = [
  {
    id: "pending-phase3",
    spoke: "open",
    label: "New market — governance vote pending",
    subLabel: "Phase 3",
  },
]

export const BORROWABLE_ASSETS: BorrowableAsset[] = [
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    subtitle: "Stablecoin",
    borrowApr: 5.2,
    totalBorrowedUsd: 21_200_000,
    utilization: 68,
    availableUsd: 9_900_000,
    walletBalanceLabel: "12,400 USDC",
    hasWalletBalance: true,
    visual: VISUALS.USDC,
    trendUp: true,
  },
  {
    id: "gho",
    symbol: "GHO",
    name: "GHO",
    subtitle: "Aave stablecoin · Lowest rate",
    borrowApr: 3.9,
    totalBorrowedUsd: 8_400_000,
    utilization: 48,
    availableUsd: 9_100_000,
    walletBalanceLabel: "0 GHO",
    hasWalletBalance: false,
    visual: VISUALS.GHO,
    trendUp: true,
  },
  {
    id: "dai",
    symbol: "DAI",
    name: "DAI",
    subtitle: "MakerDAO stablecoin",
    borrowApr: 5.7,
    totalBorrowedUsd: 4_200_000,
    utilization: 39,
    availableUsd: 6_600_000,
    walletBalanceLabel: "800 DAI",
    hasWalletBalance: true,
    visual: VISUALS.DAI,
    trendUp: false,
  },
  {
    id: "eth",
    symbol: "ETH",
    name: "Ethereum",
    subtitle: "Native asset",
    borrowApr: 4.1,
    totalBorrowedUsd: 6_100_000,
    utilization: 55,
    availableUsd: 5_000_000,
    walletBalanceLabel: "0.420 ETH",
    hasWalletBalance: true,
    visual: VISUALS.ETH,
    trendUp: true,
  },
  {
    id: "usdt",
    symbol: "USDT",
    name: "Tether USD",
    subtitle: "Stablecoin",
    borrowApr: 4.8,
    totalBorrowedUsd: 1_900_000,
    utilization: 31,
    availableUsd: 4_200_000,
    walletBalanceLabel: "3,200 USDT",
    hasWalletBalance: true,
    visual: VISUALS.USDT,
    trendUp: true,
  },
]

export const BORROW_SUPPLY_META: Record<
  string,
  { venue: string; feesLabel: string; feesUsd: number; feesBreakdown: string; accruedInterestUsd: number; openedLabel: string }
> = {
  "eth-usdc": {
    venue: "Uni v3 · 0.3% · In Range",
    feesLabel: "$142.00",
    feesUsd: 142,
    feesBreakdown: "0.021 ETH + 42.11 USDC",
    accruedInterestUsd: 52.4,
    openedLabel: "May 14, 2026",
  },
  "usdc-usdt": {
    venue: "Uni v3 · 0.01% · Full Range",
    feesLabel: "$62.40",
    feesUsd: 62.4,
    feesBreakdown: "42.11 USDC + 20.29 USDT",
    accruedInterestUsd: 32.0,
    openedLabel: "May 19, 2026",
  },
  "wbtc-eth": {
    venue: "Uni v3 · 0.3% · In Range",
    feesLabel: "$79.60",
    feesUsd: 79.6,
    feesBreakdown: "0.0011 WBTC + 0.0094 ETH",
    accruedInterestUsd: 0,
    openedLabel: "—",
  },
}

export function getSpokeById(id: BorrowSpokeId): BorrowSpoke {
  return BORROW_SPOKES.find((spoke) => spoke.id === id) ?? BORROW_SPOKES[0]
}

export function aprRangeLabel(pool: BorrowPoolRow): string {
  if (pool.aprMin === pool.aprMax) {
    return `${pool.aprMin.toFixed(1)}%`
  }
  return `${pool.aprMin.toFixed(1)}–${pool.aprMax.toFixed(1)}%`
}

export function formatRiskPremium(bps: number): string {
  const value = bps / 100
  return `+${value.toFixed(2)}%`
}

export function formatCompactUsd(value: number): string {
  if (!Number.isFinite(value)) return "—"
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  if (value === 0) return "$0"
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: value >= 100 ? 0 : 2 })}`
}

export function formatUsdExact(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: value >= 100 ? 0 : 2 })}`
}

export type PoolFilterOptions = { text?: string; spokes?: Set<BorrowSpokeId> }

export function filterPools(rows: BorrowPoolRow[], { text = "", spokes }: PoolFilterOptions = {}): BorrowPoolRow[] {
  const needle = text.trim().toLowerCase()
  const activeSpokes = spokes && spokes.size > 0 ? spokes : null
  return rows.filter((row) => {
    if (activeSpokes && !activeSpokes.has(row.spoke)) return false
    if (!needle) return true
    return (
      row.name.toLowerCase().includes(needle) ||
      row.venue.toLowerCase().includes(needle) ||
      row.dexes.some((dex) => dex.label.toLowerCase().includes(needle))
    )
  })
}

export function groupBySpoke(rows: BorrowPoolRow[]): Record<BorrowSpokeId, BorrowPoolRow[]> {
  const groups: Record<BorrowSpokeId, BorrowPoolRow[]> = { stable: [], bluechip: [], open: [] }
  for (const row of rows) {
    groups[row.spoke].push(row)
  }
  return groups
}

export function filterAssets(rows: BorrowableAsset[], text: string): BorrowableAsset[] {
  const needle = text.trim().toLowerCase()
  if (!needle) return rows
  return rows.filter(
    (row) =>
      row.symbol.toLowerCase().includes(needle) ||
      row.name.toLowerCase().includes(needle) ||
      row.subtitle.toLowerCase().includes(needle),
  )
}

export type PoolSortKey = "ltv" | "apr" | "available" | "riskPremium"
export type AssetSortKey = "apr" | "utilization" | "available" | "totalBorrowed"

export function sortPools(rows: BorrowPoolRow[], key: PoolSortKey, direction: BorrowSortDirection): BorrowPoolRow[] {
  const copy = [...rows]
  copy.sort((left, right) => {
    const leftValue = poolSortValue(left, key)
    const rightValue = poolSortValue(right, key)
    return direction === "asc" ? leftValue - rightValue : rightValue - leftValue
  })
  return copy
}

function poolSortValue(row: BorrowPoolRow, key: PoolSortKey): number {
  switch (key) {
    case "ltv":
      return row.ltv
    case "apr":
      return (row.aprMin + row.aprMax) / 2
    case "available":
      return row.availableUsd
    case "riskPremium":
      return row.riskPremiumBps
  }
}

export function sortAssets(rows: BorrowableAsset[], key: AssetSortKey, direction: BorrowSortDirection): BorrowableAsset[] {
  const copy = [...rows]
  copy.sort((left, right) => {
    const leftValue = assetSortValue(left, key)
    const rightValue = assetSortValue(right, key)
    return direction === "asc" ? leftValue - rightValue : rightValue - leftValue
  })
  return copy
}

function assetSortValue(row: BorrowableAsset, key: AssetSortKey): number {
  switch (key) {
    case "apr":
      return row.borrowApr
    case "utilization":
      return row.utilization
    case "available":
      return row.availableUsd
    case "totalBorrowed":
      return row.totalBorrowedUsd
  }
}

export function aprToneClass(apr: number): string {
  if (apr < 4) return "text-emerald-600"
  if (apr < 5.5) return "text-amber-600"
  return "text-rose-600"
}

export function utilizationToneClass(utilization: number): string {
  if (utilization < 65) return "text-emerald-600"
  if (utilization < 85) return "text-amber-600"
  return "text-rose-600"
}

export function healthFactorToneClass(hf: number | null): string {
  if (hf === null || Number.isNaN(hf)) return "text-slate-500"
  if (!Number.isFinite(hf)) return "text-slate-400"
  if (hf > 2) return "text-emerald-600"
  if (hf > 1.5) return "text-amber-600"
  return "text-rose-600"
}

export function homeVisualToBorrowVisual(visual: { symbol: string; shortLabel: string; bgClassName: string; textClassName: string }): BorrowAssetVisual {
  return {
    symbol: visual.symbol,
    shortLabel: visual.shortLabel,
    bgClass: visual.bgClassName,
    textClass: visual.textClassName,
  }
}

export function homePoolSpoke(category: string): BorrowSpokeId {
  if (category.toLowerCase().startsWith("stable")) return "stable"
  if (category.toLowerCase().startsWith("bluechip")) return "bluechip"
  return "open"
}

export const BORROWABLE_TOKEN_OPTIONS: Array<{ id: string; symbol: string }> = [
  { id: "usdc", symbol: "USDC" },
  { id: "gho", symbol: "GHO" },
  { id: "dai", symbol: "DAI" },
  { id: "eth", symbol: "ETH" },
]
