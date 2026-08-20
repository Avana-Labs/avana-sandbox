import type { LucideIcon } from "@/app/components/icons"
import { DashboardSquareAdd, MessageSquare, Umbrella } from "@/app/components/icons"

export type DesktopHeaderLink = {
  href: string
  label: string
  icon?: LucideIcon
}

// Labels are translated at the header callsite (header.tsx wraps them in t()).
// Umbrella stays out of primary nav until the product ships (page is currently a stub).
export const personalDesktopHeaderLinks: DesktopHeaderLink[] = [
  { href: "/", label: "Express" },
  { href: "/lend", label: "Lend" },
  { href: "/borrow", label: "Borrow" },
  { href: "/multiply", label: "Multiply" },
  { href: "/ask", label: "Ask AI", icon: MessageSquare },
  { href: "/dashboard", label: "Dashboard", icon: DashboardSquareAdd },
  { href: "/umbrella", label: "Umbrella", icon: Umbrella },
]
