import type { NetworkConfig, NetworkId } from "./types"

export const PORTFOLIO_NETWORKS: NetworkConfig[] = [
  { id: "all", label: "All networks", balance: "$883.74", delta: "$6.89 (0.78%) today", chartBase: 880, chartVariance: 14 },
  { id: "ethereum", label: "Ethereum", balance: "$311.56", delta: "$2.19 (0.71%) today", chartBase: 308, chartVariance: 6 },
  { id: "unichain", label: "Unichain", balance: "$221.40", delta: "$1.64 (0.75%) today", chartBase: 219, chartVariance: 5 },
  { id: "base", label: "Base", balance: "$198.42", delta: "$1.04 (0.53%) today", chartBase: 196, chartVariance: 4 },
  { id: "arbitrum", label: "Arbitrum", balance: "$142.18", delta: "$0.88 (0.62%) today", chartBase: 140, chartVariance: 3 },
  { id: "tempo", label: "Tempo", balance: "$4.20", delta: "$0.05 (1.20%) today", chartBase: 4, chartVariance: 1, isNew: true },
  { id: "monad", label: "Monad", balance: "$10.18", delta: "$0.07 (0.69%) today", chartBase: 10, chartVariance: 1 },
  { id: "solana", label: "Solana", balance: "$5.18", delta: "$0.04 (0.78%) today", chartBase: 5, chartVariance: 1 },
]

export const NETWORK_VISUAL: Record<Exclude<NetworkId, "all">, { background: string; letter: string }> = {
  ethereum: { background: "#627EEA", letter: "Ξ" },
  unichain: { background: "#F50DB4", letter: "U" },
  base: { background: "#0052FF", letter: "B" },
  arbitrum: { background: "#12AAFF", letter: "A" },
  tempo: { background: "#0A0A0A", letter: "T" },
  monad: { background: "#836EF9", letter: "M" },
  solana: { background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)", letter: "S" },
}
