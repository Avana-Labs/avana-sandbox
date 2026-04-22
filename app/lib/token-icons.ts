export type TokenIconMeta = {
  symbol: string
  iconUrl?: string
  bgClass: string
  textClass: string
}

const TOKEN_MAP: Record<string, TokenIconMeta> = {
  USDC: {
    symbol: "USDC",
    iconUrl: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
    bgClass: "bg-sky-100",
    textClass: "text-sky-700",
  },
  USDT: {
    symbol: "USDT",
    iconUrl: "https://cryptologos.cc/logos/tether-usdt-logo.png",
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-700",
  },
  DAI: {
    symbol: "DAI",
    iconUrl: "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png",
    bgClass: "bg-orange-100",
    textClass: "text-orange-700",
  },
  ETH: {
    symbol: "ETH",
    iconUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-700",
  },
  WETH: {
    symbol: "WETH",
    iconUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-700",
  },
  BTC: {
    symbol: "BTC",
    iconUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
  },
  WBTC: {
    symbol: "WBTC",
    iconUrl: "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
  },
  cbBTC: {
    symbol: "cbBTC",
    iconUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
  },
  stETH: {
    symbol: "stETH",
    iconUrl: "https://cryptologos.cc/logos/lido-dao-ldo-logo.png",
    bgClass: "bg-sky-100",
    textClass: "text-sky-600",
  },
  wstETH: {
    symbol: "wstETH",
    iconUrl: "https://cryptologos.cc/logos/lido-dao-ldo-logo.png",
    bgClass: "bg-sky-100",
    textClass: "text-sky-600",
  },
  SOL: {
    symbol: "SOL",
    iconUrl: "https://cryptologos.cc/logos/solana-sol-logo.png",
    bgClass: "bg-violet-100",
    textClass: "text-violet-700",
  },
  ARB: {
    symbol: "ARB",
    iconUrl: "https://cryptologos.cc/logos/arbitrum-arb-logo.png",
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-600",
  },
  OP: {
    symbol: "OP",
    iconUrl: "https://cryptologos.cc/logos/optimism-ethereum-op-logo.png",
    bgClass: "bg-rose-100",
    textClass: "text-rose-600",
  },
  GHO: {
    symbol: "GHO",
    bgClass: "bg-violet-100",
    textClass: "text-violet-700",
  },
  USDe: {
    symbol: "USDe",
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
  },
  "3CRV": {
    symbol: "3CRV",
    iconUrl: "https://cryptologos.cc/logos/curve-dao-token-crv-logo.png",
    bgClass: "bg-orange-100",
    textClass: "text-orange-700",
  },
  crvUSD: {
    symbol: "crvUSD",
    iconUrl: "https://cryptologos.cc/logos/curve-dao-token-crv-logo.png",
    bgClass: "bg-rose-100",
    textClass: "text-rose-700",
  },
  CRV: {
    symbol: "CRV",
    iconUrl: "https://cryptologos.cc/logos/curve-dao-token-crv-logo.png",
    bgClass: "bg-rose-100",
    textClass: "text-rose-700",
  },
  FRAX: {
    symbol: "FRAX",
    iconUrl: "https://cryptologos.cc/logos/frax-frax-logo.png",
    bgClass: "bg-zinc-100",
    textClass: "text-zinc-700",
  },
  EURC: {
    symbol: "EURC",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
  },
  sDAI: {
    symbol: "sDAI",
    iconUrl: "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png",
    bgClass: "bg-orange-100",
    textClass: "text-orange-600",
  },
  rETH: {
    symbol: "rETH",
    iconUrl: "https://cryptologos.cc/logos/rocket-pool-rpl-logo.png",
    bgClass: "bg-orange-100",
    textClass: "text-orange-600",
  },
  cbETH: {
    symbol: "cbETH",
    iconUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600",
  },
  weETH: {
    symbol: "weETH",
    iconUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-600",
  },
  AAVE: {
    symbol: "AAVE",
    iconUrl: "https://cryptologos.cc/logos/aave-aave-logo.png",
    bgClass: "bg-violet-100",
    textClass: "text-violet-700",
  },
  UNI: {
    symbol: "UNI",
    iconUrl: "https://cryptologos.cc/logos/uniswap-uni-logo.png",
    bgClass: "bg-pink-100",
    textClass: "text-pink-700",
  },
  LDO: {
    symbol: "LDO",
    iconUrl: "https://cryptologos.cc/logos/lido-dao-ldo-logo.png",
    bgClass: "bg-sky-100",
    textClass: "text-sky-700",
  },
  BAL: {
    symbol: "BAL",
    iconUrl: "https://cryptologos.cc/logos/balancer-bal-logo.png",
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
  },
  GNO: {
    symbol: "GNO",
    iconUrl: "https://cryptologos.cc/logos/gnosis-gno-gno-logo.png",
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-700",
  },
  AURA: {
    symbol: "AURA",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
  },
  AERO: {
    symbol: "AERO",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
  },
  DEGEN: {
    symbol: "DEGEN",
    bgClass: "bg-violet-100",
    textClass: "text-violet-700",
  },
  BRETT: {
    symbol: "BRETT",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600",
  },
  WELL: {
    symbol: "WELL",
    bgClass: "bg-teal-100",
    textClass: "text-teal-700",
  },
  MOG: {
    symbol: "MOG",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-700",
  },
  "USD+": {
    symbol: "USD+",
    bgClass: "bg-teal-100",
    textClass: "text-teal-700",
  },
}

export function getTokenIconMeta(symbol: string): TokenIconMeta {
  return (
    TOKEN_MAP[symbol] ??
    TOKEN_MAP[symbol.toUpperCase()] ?? {
      symbol,
      bgClass: "bg-slate-100",
      textClass: "text-slate-700",
    }
  )
}
