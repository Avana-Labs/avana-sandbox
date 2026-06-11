import type { ComponentType, SVGProps } from "react"

export type PortfolioHeroActionId = "primary" | "secondary"

type PortfolioHeroIcon = ComponentType<SVGProps<SVGSVGElement>>

export type PortfolioHeroAction = {
  id: PortfolioHeroActionId
  label: string
  icon: PortfolioHeroIcon
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
