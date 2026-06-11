import type { LucideIcon } from "lucide-react"

export type PortfolioHeroActionId = "send" | "receive" | "buy" | "more"

export type PortfolioHeroAction = {
  id: PortfolioHeroActionId
  label: string
  icon: LucideIcon
  onClick?: () => void
}

export type NetworkId =
  | "all"
  | "ethereum"
  | "unichain"
  | "base"
  | "arbitrum"
  | "tempo"
  | "monad"
  | "solana"

export type NetworkConfig = {
  id: NetworkId
  label: string
  balance: string
  delta: string
  chartBase: number
  chartVariance: number
  isNew?: boolean
}
