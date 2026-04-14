import type { LucideIcon } from "lucide-react"
import { ChartCandlestick, ChartNoAxesColumnIncreasing, FlaskConical, HandCoins, House } from "lucide-react"

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
    href: "/explore",
    label: "Borrow",
    icon: HandCoins,
    section: "Market scanner",
    description: "Review LP-backed borrowing venues, compare TVL, and read the current market surface at a glance.",
    highlights: ["Cross-chain venues", "Live TVL"],
    actionLabel: "Risk warning",
    actionHref: "/risk-warning",
  },
  {
    href: "/invest",
    label: "Invest",
    icon: ChartNoAxesColumnIncreasing,
    section: "Capital sleeves",
    description: "Deploy capital across sleeves, compare APY, and size positions without losing portfolio context.",
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
    href: "/incentivize",
    label: "Simulate",
    icon: FlaskConical,
    section: "Incentive modeling",
    description: "Preview incentive scenarios, APR changes, and pool-level tradeoffs before capital is committed.",
    highlights: ["APR modeling", "Pool scenarios"],
    actionLabel: "How it works",
    actionHref: "https://avana-ashen.vercel.app/about",
    actionExternal: true,
  },
]

export function getActiveSiteNav(pathname: string): SiteNavLink {
  return (
    siteNavLinks.find((link) => (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href))) ?? siteNavLinks[0]
  )
}
