import type { LucideIcon } from "lucide-react"
import { Gift, LayoutGrid } from "lucide-react"

export type DesktopHeaderLink = {
  href: string
  label: string
  icon?: LucideIcon
}

// Labels are translated at the header callsite (header.tsx wraps them in t()).
export const personalDesktopHeaderLinks: DesktopHeaderLink[] = [
  { href: "/", label: "Express" },
  { href: "/lend", label: "Lend" },
  { href: "/borrow", label: "Borrow" },
  { href: "/multiply", label: "Multiply" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/rewards", label: "Rewards", icon: Gift },
]
