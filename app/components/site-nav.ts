import type { ComponentType } from "react"
import type { LucideIcon } from "lucide-react"
import { Reward24Regular, Wallet24Regular } from "@fluentui/react-icons"
import {
  ChartCandlestick,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  Gift,
  HandCoins,
  House,
} from "lucide-react"

export type SiteNavLink = {
  href: string
  label: string
  icon: LucideIcon
  section: string
  description: string
  highlights: [string, string]
  actionLabel: string
  actionHref: string
  actionExternal?: boolean
}

export type DesktopHeaderLink = {
  href: string
  label: string
  icon?: ComponentType<{ className?: string }>
}

export const siteNavLinks: SiteNavLink[] = [
  {
    href: "/",
    label: "Home",
    icon: House,
    section: "Protocol overview",
    description: "Track borrowing power, venue coverage, and progress from one calmer LP collateral workspace.",
    highlights: ["Borrowing power", "Quest progress"],
    actionLabel: "Open lightpaper",
    actionHref: "https://avana-ashen.vercel.app/lightpaper",
    actionExternal: true,
  },
  {
    href: "/borrow",
    label: "Borrow",
    icon: HandCoins,
    section: "Market scanner",
    description: "Review LP-backed borrowing venues, compare TVL, and read the current market surface at a glance.",
    highlights: ["Cross-chain venues", "Live TVL"],
    actionLabel: "Support center",
    actionHref: "/support-center",
  },
  {
    href: "/lend",
    label: "Lend",
    icon: ChartNoAxesColumnIncreasing,
    section: "Capital sleeves",
    description: "Lend into sleeves, compare APY, and size positions without losing portfolio context.",
    highlights: ["Yield sleeves", "Position sizing"],
    actionLabel: "Open resources",
    actionHref: "https://avana-ashen.vercel.app/developers",
    actionExternal: true,
  },
  {
    href: "/multiply",
    label: "Multiply",
    icon: ChartCandlestick,
    section: "Directional overlays",
    description: "Monitor leverage, funding, and active overlays in a tighter LP-backed workspace.",
    highlights: ["Funding view", "Live positions"],
    actionLabel: "Support center",
    actionHref: "/support-center",
  },
  {
    href: "/rewards",
    label: "Rewards",
    icon: Gift,
    section: "Incentives",
    description: "Track quest progress, points, and protocol metrics across Avana rewards programs.",
    highlights: ["Quest progress", "Points & tiers"],
    actionLabel: "Support center",
    actionHref: "/support-center",
  },
  {
    href: "/support-center",
    label: "Support center",
    icon: CircleHelp,
    section: "Help",
    description: "Select a topic, review related articles, and contact support from a calm guided flow.",
    highlights: ["Guided help", "Message support"],
    actionLabel: "Open support",
    actionHref: "/support-center",
  },
]

export const personalDesktopHeaderLinks: DesktopHeaderLink[] = [
  { href: "/", label: "Express" },
  { href: "/lend", label: "Lend" },
  { href: "/borrow", label: "Borrow" },
  { href: "/multiply", label: "Multiply" },
  { href: "/portfolio", label: "Portfolio", icon: Wallet24Regular },
  { href: "/rewards", label: "Rewards", icon: Reward24Regular },
]

export function getActiveSiteNav(pathname: string): SiteNavLink {
  return (
    siteNavLinks.find((link) => (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href))) ?? siteNavLinks[0]
  )
}
