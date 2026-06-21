/** Shared Lighthouse route list and score floors for scripts and unit tests. */
export const LIGHTHOUSE_ROUTES = [
  "/",
  "/borrow",
  "/borrow/asset/usdc",
  "/lend",
  "/multiply",
  "/dashboard",
  "/rewards",
  "/support-center",
]

export const LIGHTHOUSE_CATEGORY_BUDGETS = {
  performance: 70,
  accessibility: 90,
  "best-practices": 95,
  seo: 100,
}

export const CHROME_FLAGS = "--headless --no-sandbox --disable-dev-shm-usage --disable-gpu"
