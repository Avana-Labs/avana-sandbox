import { LEND_ASSET_GROUPS } from "./asset-groups"
import { LEND_FEATURED_ASSETS, LEND_FEATURED_SEQUENCE } from "./featured-assets"

export { LEND_ASSET_GROUPS, type LendAssetGroup, type LendAssetRow } from "./asset-groups"
export {
  LEND_FEATURED_ASSETS,
  LEND_FEATURED_SEQUENCE,
  type LendFeaturedAsset,
  type LendFeaturedAssetId,
} from "./featured-assets"

export const TOKENS = [
  { symbol: "USDC", name: "USD Coin", balance: 8200.0, price: 1.0, color: "text-[#2775CA]", bg: "bg-[#EBF5FF]", apy: 5.2, earned: 344.4, daily: 12.4, utilization: 68 },
  { symbol: "ETH", name: "Ethereum", balance: 1.28, price: 3281.25, color: "text-[#627EEA]", bg: "bg-[#EEF0FF]", apy: 3.82, earned: 153.8, daily: 4.4, utilization: 54 },
  { symbol: "USDT", name: "Tether USD", balance: 2000.0, price: 1.0, color: "text-[#26A17B]", bg: "bg-[#E8FAF0]", apy: 4.8, earned: 0.0, daily: 0.26, utilization: 31 },
] as const

export const MARKETS = [
  { symbol: "wstETH", name: "Lido Wrapped stETH", apy: 5.14, apyChange24h: 0.18, tvl: "$8.4M", utilization: 38, type: "Liquid", protocol: "Lido", color: "text-[#627EEA]", bg: "bg-[#EEF0FF]", soon: false, event: null },
  { symbol: "WBTC", name: "Wrapped Bitcoin", apy: 3.48, apyChange24h: -0.06, tvl: "$0.9M", utilization: 29, type: "Med util", protocol: "WBTC", color: "text-[#F7931A]", bg: "bg-[#FFF5E5]", soon: false, event: null },
  { symbol: "DAI", name: "MakerDAO Stablecoin", apy: 4.01, apyChange24h: 0.22, tvl: "$4.8M", utilization: 72, type: "Liquid", protocol: "MakerDAO", color: "text-[#EA580C]", bg: "bg-[#FEF0E7]", soon: false, event: "Rewards boosted" },
  { symbol: "cbBTC", name: "Coinbase Wrapped BTC", apy: 4.25, apyChange24h: 0.04, tvl: "$2.1M", utilization: 45, type: "Liquid", protocol: "Coinbase", color: "text-[#0052FF]", bg: "bg-[#E5EEFF]", soon: false, event: null },
  { symbol: "USDe", name: "Ethena USDe", apy: 12.5, apyChange24h: 1.42, tvl: "$15.2M", utilization: 88, type: "High util", protocol: "Ethena", color: "text-[#18181B]", bg: "bg-[#F4F4F5]", soon: false, event: "Cap near full" },
  { symbol: "GHO", name: "Aave native stablecoin", apy: 0, apyChange24h: 0, tvl: "—", utilization: 0, type: "Soon", protocol: "Aave", color: "text-[#7928CA]", bg: "bg-[#F5EEFF]", soon: true, event: null },
] as const

export const ACTIVITY = [
  { type: "deposit", asset: "USDC", amount: "+8,200", date: "Mar 19", icon: "↓", bg: "bg-[#01AACF]/10", color: "text-[#01AACF]" },
  { type: "deposit", asset: "USDT", amount: "+2,000", date: "Mar 19", icon: "↓", bg: "bg-[#01AACF]/10", color: "text-[#01AACF]" },
  { type: "interest", asset: "Interest", amount: "+$12.40", date: "Mar 18", icon: "💰", bg: "bg-blue-500/10", color: "text-blue-500" },
  { type: "deposit", asset: "ETH", amount: "+1.280", date: "Mar 17", icon: "↓", bg: "bg-[#01AACF]/10", color: "text-[#01AACF]" },
  { type: "withdraw", asset: "USDC", amount: "-500", date: "Mar 16", icon: "↑", bg: "bg-rose-500/10", color: "text-rose-500" },
  { type: "deposit", asset: "USDC", amount: "+500", date: "Mar 14", icon: "↓", bg: "bg-[#01AACF]/10", color: "text-[#01AACF]" },
] as const

export const mockChartData = [
  { time: "00:00", value: 11900 },
  { time: "04:00", value: 12050 },
  { time: "08:00", value: 12100 },
  { time: "12:00", value: 12180 },
  { time: "16:00", value: 12250 },
  { time: "20:00", value: 12340 },
  { time: "24:00", value: 12400 },
] as const

export const mockLendSharedSource = {
  getTokens() {
    return TOKENS
  },
  getMarkets() {
    return MARKETS
  },
  getActivity() {
    return ACTIVITY
  },
  getChartSeries() {
    return mockChartData
  },
  getFeaturedAssets() {
    return LEND_FEATURED_ASSETS
  },
  getFeaturedSequence() {
    return LEND_FEATURED_SEQUENCE
  },
  getAssetGroups() {
    return LEND_ASSET_GROUPS
  },
}
