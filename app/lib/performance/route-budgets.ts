import { SITE_STATIC_ROUTES } from "@/app/lib/route-manifest"

/** Primary marketing/product routes audited by Lighthouse and navigation-timing e2e checks. */
export const LIGHTHOUSE_ROUTES = [
  "/",
  "/borrow",
  "/borrow/asset/usdc",
  "/borrow/markets/uni-v3-bluechip-weth-usdc",
  "/borrow/assets/uni-v3-bluechip%3Ausdc",
  "/lend",
  "/lend/markets/usdc",
  "/multiply",
  "/multiply/markets/aave-gho",
  "/dashboard",
  "/rewards",
  "/support-center",
] as const

export type LighthouseRoute = (typeof LIGHTHOUSE_ROUTES)[number]

export type ActionLighthouseRoute = {
  name: string
  path: string
}

/** Action box routes exercised in smoke and Lighthouse budgets. */
export const ACTION_LIGHTHOUSE_ROUTES: ActionLighthouseRoute[] = [
  { name: "borrow-select", path: "/actions/borrow/borrow" },
  { name: "borrow-configure", path: "/actions/borrow/borrow?asset=uni-v3-bluechip:usdc&amount=500" },
  { name: "repay-select", path: "/actions/borrow/repay" },
  { name: "repay-configure", path: "/actions/borrow/repay?amount=500" },
  { name: "supply-configure", path: "/actions/borrow/supply?amount=1000" },
  { name: "remove-configure", path: "/actions/borrow/remove" },
  { name: "borrow-claim", path: "/actions/borrow/claim" },
  { name: "lend-deposit", path: "/actions/lend/deposit?amount=10&market=usdc" },
  { name: "lend-withdraw-select", path: "/actions/lend/withdraw" },
  { name: "lend-withdraw-configure", path: "/actions/lend/withdraw?market=gho&amount=1" },
  { name: "multiply-configure", path: "/actions/multiply/multiply?multiplier=2&amount=1" },
  { name: "deleverage-configure", path: "/actions/multiply/deleverage?multiplier=1.5&amount=1" },
  { name: "rewards-claim", path: "/actions/rewards/claim" },
]

export const ALL_LIGHTHOUSE_ROUTE_PATHS = [
  ...LIGHTHOUSE_ROUTES,
  ...ACTION_LIGHTHOUSE_ROUTES.map((route) => route.path),
] as const

export const LIGHTHOUSE_CATEGORY_BUDGETS = {
  performance: 100,
  accessibility: 100,
  "best-practices": 100,
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
  { route: "/", heroText: "Borrow", heroRole: "tab" },
  { route: "/borrow", heroText: "Total TVL" },
  { route: "/borrow/markets/uni-v3-bluechip-weth-usdc", heroText: "Market data" },
  { route: "/borrow/assets/uni-v3-bluechip%3Ausdc", heroText: "Asset data" },
  { route: "/lend", heroText: "Total TVL" },
  { route: "/lend/markets/usdc", heroText: "Supply APY" },
  { route: "/multiply", heroText: "Total TVL" },
  { route: "/multiply/markets/aave-gho", heroText: "Market data" },
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
