import type { LucideIcon } from "@/app/components/icons"
import { PieChart, Repeat2 } from "@/app/components/icons"

export type DesktopHeaderLink = {
  href: string
  label: string
  icon?: LucideIcon
}

// Labels are translated at the header callsite (header.tsx wraps them in t()).
export const personalDesktopHeaderLinks: DesktopHeaderLink[] = [
  { href: "/", label: "Express" },
  { href: "/swap", label: "Swap", icon: Repeat2 },
  { href: "/lend", label: "Lend" },
  { href: "/borrow", label: "Borrow" },
  { href: "/multiply", label: "Multiply" },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
]
