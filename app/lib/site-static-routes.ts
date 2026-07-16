export type SiteRoute = {
  route: string
  priority: number
}

/** Shared static route manifest for build, tests, and performance budgets. */
export const SITE_STATIC_ROUTES: SiteRoute[] = [
  { route: "", priority: 1.0 },
  { route: "/borrow", priority: 0.9 },
  { route: "/lend", priority: 0.85 },
  { route: "/multiply", priority: 0.85 },
  { route: "/portfolio", priority: 0.72 },
  { route: "/support-center", priority: 0.45 },
]
