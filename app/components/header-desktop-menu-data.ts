import { personalDesktopHeaderLinks } from "./site-nav"

// The desktop mega-menu is scoped to the product routes. IDs must stay in sync with the
// panel configs in header-desktop-menu-panel.tsx and the trigger wiring in
// header-desktop-navigation.tsx.
export type DesktopMenuId = "lend" | "borrow" | "multiply"

const PRODUCT_HREFS: Record<string, DesktopMenuId> = {
  "/lend": "lend",
  "/borrow": "borrow",
  "/multiply": "multiply",
}

// Which product links are upgraded to hover/focus mega-menu triggers. Any product link not
// listed here renders as an ordinary pill link, so panels can ship one at a time.
export const desktopMenusWithPanel: readonly DesktopMenuId[] = ["lend", "borrow"]

// The primary desktop nav mirrors the existing header links (Express + the three products);
// utility links (Dashboard, Umbrella) stay on the right and are handled by the header itself.
export const desktopPrimaryLinks = personalDesktopHeaderLinks.slice(0, 4)

export function menuIdForHref(href: string): DesktopMenuId | null {
  return PRODUCT_HREFS[href] ?? null
}

export function hasPanel(id: DesktopMenuId | null): id is DesktopMenuId {
  return id !== null && desktopMenusWithPanel.includes(id)
}
