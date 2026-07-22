import routeConfig from "../config/performance-routes.json" with { type: "json" }

/** Shared Lighthouse route list and score floors for scripts and unit tests. */
export const LIGHTHOUSE_ROUTES = [
  ...routeConfig.primaryRoutes.map(({ route }) => route),
  ...routeConfig.actionRoutes.map(({ path }) => path),
]

export const LIGHTHOUSE_CATEGORY_BUDGETS = {
  performance: 100,
  accessibility: 100,
  "best-practices": 100,
  seo: 100,
}

export const LIGHTHOUSE_NUMERIC_BUDGETS = {
  firstContentfulPaintMs: 1_200,
  largestContentfulPaintMs: 2_500,
  totalBlockingTimeMs: 200,
  unusedJavaScriptBytes: 200 * 1024,
  totalByteWeightBytes: 1_200 * 1024,
  domNodes: 1_000,
  mainThreadWorkMs: 2_000,
}

/**
 * Lighthouse must verify that an audit reached the intended application surface.
 * Without this, the client-side sandbox gate can make every route score the same
 * onboarding screen while appearing to audit Borrow, Lend, or Multiply.
 */
export const LIGHTHOUSE_ROUTE_MARKERS = Object.fromEntries([
  ...routeConfig.primaryRoutes.map(({ route, marker }) => [route, marker]),
  ...routeConfig.actionRoutes.map(({ path, marker }) => [path, marker]),
])

export const LIGHTHOUSE_ONBOARDING_MARKER = "This risk-free Avana Sandbox lets you borrow against practice LP positions"

export const CHROME_FLAGS = "--headless --no-sandbox --disable-dev-shm-usage --disable-gpu"
