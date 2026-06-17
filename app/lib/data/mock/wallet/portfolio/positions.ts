import type { HomeCollateralPool } from "@/app/lib/home-sim"

export type WalletCollateralRecord = {
  id: string
  walletProfileId: string
  pool: HomeCollateralPool
  borrowedUsd: number
  healthFactor: number | null
  pairApr: number
  feesUsd: number
  feesLabel: string
}

export type WalletMultiplyPositionRecord = {
  id: string
  walletProfileId: string
  symbol: string
  label: string
  side: "long" | "short"
  leverage: number
  collateralUsd: number
  exposureUsd: number
  pnlUsd: number
  pnlPct: number
  status: "open" | "closed"
}

export type WalletOpenOrderRecord = {
  id: string
  walletProfileId: string
  label: string
  status: "open" | "pending" | "filled"
  sizeUsd: number
  venue: string
}

export type WalletTwapOrderRecord = {
  id: string
  walletProfileId: string
  label: string
  interval: string
  status: "active" | "paused" | "completed"
  amountUsd: number
}

const ETH_USDC_POOL: HomeCollateralPool = {
  id: "uni-v3-bluechip-weth-usdc",
  name: "WETH / USDC",
  venue: "Uniswap v3 Bluechip",
  category: "v3",
  collateralUsd: 184_200,
  maxLtv: 76.5,
  borrowPowerUsd: 141_021,
  liquidationUsd: 120_900,
  pairApr: 5.3,
  visuals: [
    {
      symbol: "WETH",
      shortLabel: "W",
      bgClassName: "bg-sky-500",
      textClassName: "text-white",
    },
    {
      symbol: "USDC",
      shortLabel: "U",
      bgClassName: "bg-cyan-500",
      textClassName: "text-white",
    },
  ],
}

const WBTC_WETH_POOL: HomeCollateralPool = {
  id: "aerodrome-wbtc-weth",
  name: "WBTC / WETH",
  venue: "Aerodrome",
  category: "v3",
  collateralUsd: 96_800,
  maxLtv: 74.2,
  borrowPowerUsd: 71_840,
  liquidationUsd: 63_500,
  pairApr: 4.9,
  visuals: [
    {
      symbol: "WBTC",
      shortLabel: "B",
      bgClassName: "bg-amber-500",
      textClassName: "text-white",
    },
    {
      symbol: "WETH",
      shortLabel: "W",
      bgClassName: "bg-sky-500",
      textClassName: "text-white",
    },
  ],
}

const USDC_USDT_POOL: HomeCollateralPool = {
  id: "curve-usdc-usdt",
  name: "USDC / USDT",
  venue: "Curve",
  category: "stable",
  collateralUsd: 74_300,
  maxLtv: 82,
  borrowPowerUsd: 61_000,
  liquidationUsd: 55_400,
  pairApr: 3.1,
  visuals: [
    {
      symbol: "USDC",
      shortLabel: "U",
      bgClassName: "bg-cyan-500",
      textClassName: "text-white",
    },
    {
      symbol: "USDT",
      shortLabel: "T",
      bgClassName: "bg-amber-500",
      textClassName: "text-white",
    },
  ],
}

export const WALLET_COLLATERALS: WalletCollateralRecord[] = [
  {
    id: "collateral-eth-usdc",
    walletProfileId: "demo-wallet",
    pool: ETH_USDC_POOL,
    borrowedUsd: 38_400,
    healthFactor: 2.84,
    pairApr: 5.3,
    feesUsd: 1_180,
    feesLabel: "$1.18K",
  },
  {
    id: "collateral-wbtc-weth",
    walletProfileId: "demo-wallet",
    pool: WBTC_WETH_POOL,
    borrowedUsd: 0,
    healthFactor: null,
    pairApr: 4.9,
    feesUsd: 2_040,
    feesLabel: "$2.04K",
  },
  {
    id: "collateral-usdc-usdt",
    walletProfileId: "demo-wallet",
    pool: USDC_USDT_POOL,
    borrowedUsd: 12_000,
    healthFactor: 3.22,
    pairApr: 3.1,
    feesUsd: 610,
    feesLabel: "$610",
  },
]

export const WALLET_MULTIPLY_POSITIONS: WalletMultiplyPositionRecord[] = [
  {
    id: "mult-eth-loop",
    walletProfileId: "demo-wallet",
    symbol: "ETH",
    label: "ETH Loop",
    side: "long",
    leverage: 4,
    collateralUsd: 42_800,
    exposureUsd: 171_200,
    pnlUsd: 4_120,
    pnlPct: 9.62,
    status: "open",
  },
  {
    id: "mult-sol-momentum",
    walletProfileId: "demo-wallet",
    symbol: "SOL",
    label: "SOL Momentum",
    side: "long",
    leverage: 3,
    collateralUsd: 210_000,
    exposureUsd: 630_000,
    pnlUsd: 18_400,
    pnlPct: 8.76,
    status: "open",
  },
  {
    id: "mult-arb-carry",
    walletProfileId: "demo-wallet",
    symbol: "ARB",
    label: "ARB Carry",
    side: "short",
    leverage: 2,
    collateralUsd: 88_500,
    exposureUsd: 177_000,
    pnlUsd: -8_850,
    pnlPct: -10.0,
    status: "closed",
  },
]

export const WALLET_OPEN_ORDERS: WalletOpenOrderRecord[] = [
  {
    id: "open-1",
    walletProfileId: "demo-wallet",
    label: "USDC ladder",
    status: "open",
    sizeUsd: 42_000,
    venue: "Uniswap v3",
  },
  {
    id: "open-2",
    walletProfileId: "demo-wallet",
    label: "ETH range",
    status: "pending",
    sizeUsd: 18_200,
    venue: "Aerodrome",
  },
]

export const WALLET_TWAP_ORDERS: WalletTwapOrderRecord[] = [
  {
    id: "twap-1",
    walletProfileId: "demo-wallet",
    label: "DAI roll",
    interval: "4h",
    status: "active",
    amountUsd: 65_000,
  },
]

export function getWalletCollaterals(walletProfileId: string) {
  return WALLET_COLLATERALS.filter((record) => record.walletProfileId === walletProfileId)
}

export function getWalletMultiplyPositions(walletProfileId: string) {
  return WALLET_MULTIPLY_POSITIONS.filter((record) => record.walletProfileId === walletProfileId)
}

export function getWalletOpenOrders(walletProfileId: string) {
  return WALLET_OPEN_ORDERS.filter((record) => record.walletProfileId === walletProfileId)
}

export function getWalletTwapOrders(walletProfileId: string) {
  return WALLET_TWAP_ORDERS.filter((record) => record.walletProfileId === walletProfileId)
}
