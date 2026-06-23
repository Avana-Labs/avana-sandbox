/** Shared Lighthouse route list and score floors for scripts and unit tests. */
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
  "/actions/borrow/borrow",
  "/actions/borrow/borrow?asset=uni-v3-bluechip:usdc&amount=500",
  "/actions/borrow/repay",
  "/actions/borrow/repay?amount=500",
  "/actions/borrow/supply?amount=1000",
  "/actions/borrow/remove",
  "/actions/borrow/claim",
  "/actions/lend/deposit?amount=10&market=usdc",
  "/actions/lend/withdraw",
  "/actions/lend/withdraw?market=gho&amount=1",
  "/actions/multiply/multiply?multiplier=2&amount=1",
  "/actions/multiply/deleverage?multiplier=1.5&amount=1",
  "/actions/rewards/claim",
]

export const LIGHTHOUSE_CATEGORY_BUDGETS = {
  performance: 100,
  accessibility: 100,
  "best-practices": 100,
  seo: 100,
}

export const CHROME_FLAGS = "--headless --no-sandbox --disable-dev-shm-usage --disable-gpu"
