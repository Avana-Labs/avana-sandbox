import { SITE_STATIC_ROUTES } from "@/app/lib/route-manifest"

/** Routes audited by Lighthouse and navigation-timing e2e checks. */
export const LIGHTHOUSE_ROUTES = [
  "/",
  "/borrow",
  "/borrow/asset/usdc",
  "/lend",
  "/multiply",
  "/dashboard",
  "/rewards",
  "/support-center",
] as const

export type LighthouseRoute = (typeof LIGHTHOUSE_ROUTES)[number]

export const LIGHTHOUSE_CATEGORY_BUDGETS = {
  performance: 70,
  accessibility: 90,
  "best-practices": 95,
  seo: 100,
} as const

export type LighthouseCategory = keyof typeof LIGHTHOUSE_CATEGORY_BUDGETS

export type NavigationTimingBudget = {
  domContentLoadedMs: number
  heroVisibleMs: number
}

/** Playwright navigation timing ceilings used after route discovery. */
export const NAVIGATION_TIMING_BUDGETS: NavigationTimingBudget = {
  domContentLoadedMs: 4_000,
  heroVisibleMs: 5_000,
}

export const ROUTE_TIMING_OVERRIDES: Partial<Record<LighthouseRoute, Partial<NavigationTimingBudget>>> = {}

export function getNavigationTimingBudget(route: LighthouseRoute): NavigationTimingBudget {
  const override = ROUTE_TIMING_OVERRIDES[route] ?? {}
  return {
    domContentLoadedMs: override.domContentLoadedMs ?? NAVIGATION_TIMING_BUDGETS.domContentLoadedMs,
    heroVisibleMs: override.heroVisibleMs ?? NAVIGATION_TIMING_BUDGETS.heroVisibleMs,
  }
}

export type RouteHeroSelector = {
  route: LighthouseRoute
  /** Visible copy that should paint early once the route is interactive. */
  heroText: string
  /** When set, targets an explicit ARIA role instead of free text. */
  heroRole?: "tab" | "heading"
}

export const ROUTE_HERO_SELECTORS: RouteHeroSelector[] = [
  { route: "/", heroText: "Continue to borrow" },
  { route: "/borrow", heroText: "Total TVL" },
  { route: "/lend", heroText: "Total TVL" },
  { route: "/multiply", heroText: "Total TVL" },
  { route: "/dashboard", heroText: "Borrow", heroRole: "tab" },
  { route: "/rewards", heroText: "AVA balance" },
  { route: "/support-center", heroText: "How can we help?", heroRole: "heading" },
]

export function scoreLighthouseCategory(score: number | null | undefined) {
  return Math.round((score ?? 0) * 100)
}

export function isLighthouseScoreWithinBudget(category: LighthouseCategory, score: number) {
  return score >= LIGHTHOUSE_CATEGORY_BUDGETS[category]
}

export function getAuditedStaticRoutes() {
  return SITE_STATIC_ROUTES.map((entry) => (entry.route === "" ? "/" : entry.route))
}
