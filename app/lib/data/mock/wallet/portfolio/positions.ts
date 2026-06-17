import type {
  PortfolioCollateralRecord,
  PortfolioMultiplyPositionRecord,
  PortfolioOpenOrderRecord,
  PortfolioPoolRecord,
  PortfolioTwapOrderRecord,
} from "@/app/lib/data/providers/portfolio/source"

const ETH_USDC_POOL: PortfolioPoolRecord = {
  id: "uni-v3-bluechip-weth-usdc",
  name: "WETH / USDC",
  venue: "Uniswap v3 Bluechip",
  category: "v3",
  collateralUsd: 42_200,
  maxLtv: 76.5,
  borrowPowerUsd: 32_300,
  liquidationUsd: 30_100,
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

const WBTC_WETH_POOL: PortfolioPoolRecord = {
  id: "aerodrome-wbtc-weth",
  name: "WBTC / WETH",
  venue: "Aerodrome",
  category: "v3",
  collateralUsd: 26_800,
  maxLtv: 74.2,
  borrowPowerUsd: 19_900,
  liquidationUsd: 19_500,
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

const USDC_USDT_POOL: PortfolioPoolRecord = {
  id: "curve-usdc-usdt",
  name: "USDC / USDT",
  venue: "Curve",
  category: "stable",
  collateralUsd: 18_900,
  maxLtv: 82,
  borrowPowerUsd: 15_500,
  liquidationUsd: 14_800,
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

export const WALLET_COLLATERALS: PortfolioCollateralRecord[] = [
  {
    id: "collateral-eth-usdc",
    walletProfileId: "demo-wallet",
    pool: ETH_USDC_POOL,
    borrowedUsd: 12_400,
    healthFactor: 2.60,
    pairApr: 5.3,
    feesUsd: 418,
  },
  {
    id: "collateral-wbtc-weth",
    walletProfileId: "demo-wallet",
    pool: WBTC_WETH_POOL,
    borrowedUsd: 8_800,
    healthFactor: 2.26,
    pairApr: 4.9,
    feesUsd: 612,
  },
  {
    id: "collateral-usdc-usdt",
    walletProfileId: "demo-wallet",
    pool: USDC_USDT_POOL,
    borrowedUsd: 6_200,
    healthFactor: 2.50,
    pairApr: 3.1,
    feesUsd: 186,
  },
]

export const WALLET_MULTIPLY_POSITIONS: PortfolioMultiplyPositionRecord[] = [
  {
    id: "mult-eth-loop",
    walletProfileId: "demo-wallet",
    symbol: "ETH",
    label: "ETH Loop",
    side: "long",
    leverage: 4,
    collateralUsd: 8_400,
    exposureUsd: 33_600,
    pnlUsd: 720,
    pnlPct: 8.57,
    status: "open",
  },
  {
    id: "mult-sol-momentum",
    walletProfileId: "demo-wallet",
    symbol: "SOL",
    label: "SOL Momentum",
    side: "long",
    leverage: 3,
    collateralUsd: 11_500,
    exposureUsd: 34_500,
    pnlUsd: 1_140,
    pnlPct: 9.91,
    status: "open",
  },
  {
    id: "mult-arb-carry",
    walletProfileId: "demo-wallet",
    symbol: "ARB",
    label: "ARB Carry",
    side: "short",
    leverage: 2,
    collateralUsd: 6_200,
    exposureUsd: 12_400,
    pnlUsd: -410,
    pnlPct: -6.61,
    status: "closed",
  },
]

export const WALLET_OPEN_ORDERS: PortfolioOpenOrderRecord[] = [
  {
    id: "open-1",
    walletProfileId: "demo-wallet",
    label: "USDC ladder",
    status: "open",
    sizeUsd: 16_200,
    venue: "Uniswap v3",
  },
  {
    id: "open-2",
    walletProfileId: "demo-wallet",
    label: "ETH range",
    status: "pending",
    sizeUsd: 9_400,
    venue: "Aerodrome",
  },
]

export const WALLET_TWAP_ORDERS: PortfolioTwapOrderRecord[] = [
  {
    id: "twap-1",
    walletProfileId: "demo-wallet",
    label: "DAI roll",
    interval: "4h",
    status: "active",
    amountUsd: 24_000,
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
