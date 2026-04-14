import type { LucideIcon } from "lucide-react"
import { CircleDollarSign, HandCoins, House, LineChart, Sparkles } from "lucide-react"

export type SiteNavLink = {
  href: string
  label: string
  icon: LucideIcon
}

export const siteNavLinks: SiteNavLink[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Borrow", icon: HandCoins },
  { href: "/invest", label: "Invest", icon: CircleDollarSign },
  { href: "/perps", label: "Perps", icon: LineChart },
  { href: "/incentivize", label: "Simulate", icon: Sparkles },
]
