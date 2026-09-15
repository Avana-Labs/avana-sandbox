export type SiteRoute = {
  route: string
  priority: number
  // Whether the route belongs in the sitemap. Most app routes are noindex (wallet-gated; marketing
  // owns brand SEO), so they stay in this manifest for perf budgets but are excluded from the
  // sitemap. Kept in sync with the layout noindex default + buildSeoMetadata({ index: true }).
  indexable?: boolean
}

/** Shared static route manifest for build, tests, and performance budgets. */
export const SITE_STATIC_ROUTES: SiteRoute[] = [
  { route: "", priority: 1.0, indexable: true },
  { route: "/borrow", priority: 0.9 },
  { route: "/lend", priority: 0.85 },
  { route: "/multiply", priority: 0.85 },
  { route: "/swap", priority: 0.82 },
  { route: "/dashboard", priority: 0.72 },
  { route: "/support-center", priority: 0.45 },
]
