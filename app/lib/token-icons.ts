import { getLocalAssetIcon, LOCAL_ASSET_ICON_FALLBACK } from "@/app/lib/local-asset-icons"

export type TokenIconMeta = {
  symbol: string
  iconUrl?: string
  bgClass: string
  textClass: string
}

const TOKEN_MAP: Record<string, TokenIconMeta> = {
  AVA: {
    symbol: "AVA",
    iconUrl: getLocalAssetIcon("AVA"),
    bgClass: "bg-sky-100",
    textClass: "text-sky-700",
  },
  USDC: {
    symbol: "USDC",
    iconUrl: getLocalAssetIcon("USDC"),
    bgClass: "bg-sky-100",
    textClass: "text-sky-700",
  },
  USDT: {
    symbol: "USDT",
    iconUrl: getLocalAssetIcon("USDT"),
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-700",
  },
  DAI: {
    symbol: "DAI",
    iconUrl: getLocalAssetIcon("DAI"),
    bgClass: "bg-orange-100",
    textClass: "text-orange-700",
  },
  ETH: {
    symbol: "ETH",
    iconUrl: getLocalAssetIcon("ETH"),
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-700",
  },
  WETH: {
    symbol: "WETH",
    iconUrl: getLocalAssetIcon("WETH"),
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-700",
  },
  BTC: {
    symbol: "BTC",
    iconUrl: getLocalAssetIcon("BTC"),
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
  },
  WBTC: {
    symbol: "WBTC",
    iconUrl: getLocalAssetIcon("WBTC"),
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
  },
  cbBTC: {
    symbol: "cbBTC",
    iconUrl: getLocalAssetIcon("cbBTC"),
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
  },
  stETH: {
    symbol: "stETH",
    iconUrl: getLocalAssetIcon("stETH"),
    bgClass: "bg-sky-100",
    textClass: "text-sky-600",
  },
  wstETH: {
    symbol: "wstETH",
    iconUrl: getLocalAssetIcon("wstETH"),
    bgClass: "bg-sky-100",
    textClass: "text-sky-600",
  },
  SOL: {
    symbol: "SOL",
    iconUrl: getLocalAssetIcon("SOL"),
    bgClass: "bg-violet-100",
    textClass: "text-violet-700",
  },
  ARB: {
    symbol: "ARB",
    iconUrl: getLocalAssetIcon("ARB"),
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-600",
  },
  OP: {
    symbol: "OP",
    iconUrl: getLocalAssetIcon("OP"),
    bgClass: "bg-rose-100",
    textClass: "text-rose-600",
  },
  GHO: {
    symbol: "GHO",
    iconUrl: getLocalAssetIcon("GHO"),
    bgClass: "bg-violet-100",
    textClass: "text-violet-700",
  },
  USDe: {
    symbol: "USDe",
    iconUrl: getLocalAssetIcon("USDe"),
    bgClass: "bg-muted",
    textClass: "text-foreground",
  },
  "3CRV": {
    symbol: "3CRV",
    iconUrl: getLocalAssetIcon("3CRV"),
    bgClass: "bg-orange-100",
    textClass: "text-orange-700",
  },
  crvUSD: {
    symbol: "crvUSD",
    iconUrl: getLocalAssetIcon("crvUSD"),
    bgClass: "bg-rose-100",
    textClass: "text-rose-700",
  },
  CRV: {
    symbol: "CRV",
    iconUrl: getLocalAssetIcon("CRV"),
    bgClass: "bg-rose-100",
    textClass: "text-rose-700",
  },
  FRAX: {
    symbol: "FRAX",
    iconUrl: getLocalAssetIcon("FRAX"),
    bgClass: "bg-zinc-100",
    textClass: "text-zinc-700",
  },
  EURC: {
    symbol: "EURC",
    iconUrl: getLocalAssetIcon("EURC"),
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
  },
  sDAI: {
    symbol: "sDAI",
    iconUrl: getLocalAssetIcon("sDAI"),
    bgClass: "bg-orange-100",
    textClass: "text-orange-600",
  },
  rETH: {
    symbol: "rETH",
    iconUrl: getLocalAssetIcon("rETH"),
    bgClass: "bg-orange-100",
    textClass: "text-orange-600",
  },
  cbETH: {
    symbol: "cbETH",
    iconUrl: getLocalAssetIcon("cbETH"),
    bgClass: "bg-blue-100",
    textClass: "text-blue-600",
  },
  weETH: {
    symbol: "weETH",
    iconUrl: getLocalAssetIcon("weETH"),
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-600",
  },
  AAVE: {
    symbol: "AAVE",
    iconUrl: getLocalAssetIcon("AAVE"),
    bgClass: "bg-violet-100",
    textClass: "text-violet-700",
  },
  UNI: {
    symbol: "UNI",
    iconUrl: getLocalAssetIcon("UNI"),
    bgClass: "bg-pink-100",
    textClass: "text-pink-700",
  },
  LDO: {
    symbol: "LDO",
    iconUrl: getLocalAssetIcon("LDO"),
    bgClass: "bg-sky-100",
    textClass: "text-sky-700",
  },
  BAL: {
    symbol: "BAL",
    iconUrl: getLocalAssetIcon("BAL"),
    bgClass: "bg-muted",
    textClass: "text-foreground",
  },
  GNO: {
    symbol: "GNO",
    iconUrl: getLocalAssetIcon("GNO"),
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-700",
  },
  AURA: {
    symbol: "AURA",
    iconUrl: getLocalAssetIcon("AURA"),
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
  },
  AERO: {
    symbol: "AERO",
    iconUrl: getLocalAssetIcon("AERO"),
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
  },
  DEGEN: {
    symbol: "DEGEN",
    iconUrl: getLocalAssetIcon("DEGEN"),
    bgClass: "bg-violet-100",
    textClass: "text-violet-700",
  },
  BRETT: {
    symbol: "BRETT",
    iconUrl: getLocalAssetIcon("BRETT"),
    bgClass: "bg-blue-100",
    textClass: "text-blue-600",
  },
  WELL: {
    symbol: "WELL",
    iconUrl: getLocalAssetIcon("WELL"),
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
    iconUrl: getLocalAssetIcon("USD+"),
    bgClass: "bg-teal-100",
    textClass: "text-teal-700",
  },
}

export function getTokenIconMeta(symbol: string): TokenIconMeta {
  const mapped = TOKEN_MAP[symbol] ?? TOKEN_MAP[symbol.toUpperCase()]
  if (mapped) return mapped

  // Symbol absent from the curated map (e.g. "CRVUSD", whose only TOKEN_MAP keys are
  // "crvUSD"/"CRV"): fall back to the complete, case-insensitive local-asset alias
  // map so it still resolves its real icon instead of dropping to a text glyph.
  // getLocalAssetIcon returns the neutral placeholder for a truly unknown symbol —
  // treat that as "no icon" so the colored-letter fallback still renders.
  const localIcon = getLocalAssetIcon(symbol)
  return {
    symbol,
    iconUrl: localIcon === LOCAL_ASSET_ICON_FALLBACK ? undefined : localIcon,
    bgClass: "bg-muted",
    textClass: "text-foreground",
  }
}
