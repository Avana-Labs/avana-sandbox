import type { LucideIcon } from "@/app/components/icons"
import { CircleArrowDown, CircleArrowUp, HandCoins, LogIn, LogOut } from "@/app/components/icons"

// Aave-style action glyphs: deposit/supply flows down-into (circled down arrow),
// borrow flows up-out (circled up arrow), repay is money going back in (LogIn),
// withdraw is money coming out (LogOut). Multiply/Deleverage reuse the circled
// up/down pair (add vs. reduce leverage); Pledge reads like a deposit.
const ACTION_ICONS: Record<string, LucideIcon> = {
  deposit: CircleArrowDown,
  supply: CircleArrowDown,
  pledge: CircleArrowDown,
  borrow: CircleArrowUp,
  repay: LogIn,
  withdraw: LogOut,
  multiply: CircleArrowUp,
  deleverage: CircleArrowDown,
  // Trading-fee actions: claim collects earned fees (money in-hand), remove pulls
  // liquidity back out (same out-flow semantic as withdraw).
  claim: HandCoins,
  remove: LogOut,
}

/** Renders the directional icon for an action label, or nothing if unmapped.
 * Sizing/color come from the parent Button (`[&_svg]:size-3.5`, text color). */
export function ActionIcon({ label, className }: { label: string; className?: string }) {
  const Icon = ACTION_ICONS[label.trim().toLowerCase()]
  return Icon ? <Icon className={className} aria-hidden="true" /> : null
}
