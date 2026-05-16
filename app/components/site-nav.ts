import type { LucideIcon } from "lucide-react"
import {
  ChartCandlestick,
  ChartNoAxesColumnIncreasing,
  Gift,
  HandCoins,
  House,
  Sprout,
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

export type HeaderMode = "personal" | "business"

export type DesktopHeaderLink = {
  href: string
  label: string
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
    actionLabel: "Risk warning",
    actionHref: "/risk-warning",
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
    href: "/perps",
    label: "Perps",
    icon: ChartCandlestick,
    section: "Directional overlays",
    description: "Monitor leverage, funding, and active overlays in a tighter trading workspace built around LP positions.",
    highlights: ["Funding view", "Live positions"],
    actionLabel: "Risk warning",
    actionHref: "/risk-warning",
  },
  {
    href: "/stake",
    label: "Stake",
    icon: Sprout,
    section: "LP staking",
    description: "Choose a pool, lock assets, and preview rewards and APR before you stake LP collateral.",
    highlights: ["Reward preview", "Lock terms"],
    actionLabel: "How it works",
    actionHref: "https://avana-ashen.vercel.app/about",
    actionExternal: true,
  },
  {
    href: "/rewards",
    label: "Rewards",
    icon: Gift,
    section: "Incentives",
    description: "Track quest progress, points, and protocol metrics across Avana rewards programs.",
    highlights: ["Quest progress", "Points & tiers"],
    actionLabel: "Risk warning",
    actionHref: "/risk-warning",
  },
]

export const personalDesktopHeaderLinks: DesktopHeaderLink[] = [
  { href: "/", label: "Home" },
  { href: "/borrow", label: "Borrow" },
  { href: "/lend", label: "Invest" },
  { href: "/perps", label: "Trade" },
  { href: "/rewards", label: "Rewards" },
  { href: "/manage", label: "Manage" },
]

export const businessDesktopHeaderLinks: DesktopHeaderLink[] = [
  { href: "/business/credit-markets", label: "Credit Markets" },
  { href: "/business/credit-lines", label: "Credit Lines" },
  { href: "/business/risk-analysis", label: "Risk Analysis" },
]

export function getHeaderMode(pathname: string): HeaderMode {
  return pathname.startsWith("/business") ? "business" : "personal"
}

export function getActiveSiteNav(pathname: string): SiteNavLink {
  return (
    siteNavLinks.find((link) => (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href))) ?? siteNavLinks[0]
  )
}
