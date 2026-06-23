import type { ComponentType, SVGProps } from "react"

export type PortfolioHeroActionId = string

type PortfolioHeroIcon = ComponentType<SVGProps<SVGSVGElement>>

export type PortfolioHeroAction = {
  id: PortfolioHeroActionId
  label: string
  icon: PortfolioHeroIcon
  href?: string
  onClick?: () => void
  className?: string
}
