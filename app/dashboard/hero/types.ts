import type { ComponentType, SVGProps } from "react"

export type DashboardHeroActionId = string

type DashboardHeroIcon = ComponentType<SVGProps<SVGSVGElement>>

export type DashboardHeroAction = {
  id: DashboardHeroActionId
  label: string
  icon: DashboardHeroIcon
  href?: string
  onClick?: () => void
  className?: string
}
