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

/**
 * Lighthouse must verify that an audit reached the intended application surface.
 * Without this, the client-side sandbox gate can make every route score the same
 * onboarding screen while appearing to audit Borrow, Lend, or Multiply.
 */
export const LIGHTHOUSE_ROUTE_MARKERS = {
  "/": "Borrow",
  "/borrow": "Total TVL",
  "/borrow/asset/usdc": "Asset data",
  "/borrow/markets/uni-v3-bluechip-weth-usdc": "Total supplied",
  "/borrow/assets/uni-v3-bluechip%3Ausdc": "Asset data",
  "/lend": "Total TVL",
  "/lend/markets/usdc": "Supply APY",
  "/multiply": "Total TVL",
  "/multiply/markets/aave-gho": "Total value locked",
  "/dashboard": "Borrow",
  "/rewards": "AVA balance",
  "/support-center": "How can we help?",
  "/actions/borrow/borrow": "Borrow",
  "/actions/borrow/borrow?asset=uni-v3-bluechip:usdc&amount=500": "Borrow",
  "/actions/borrow/repay": "Repay",
  "/actions/borrow/repay?amount=500": "Repay",
  "/actions/borrow/supply?amount=1000": "Supply",
  "/actions/borrow/remove": "Remove",
  "/actions/borrow/claim": "Claim",
  "/actions/lend/deposit?amount=10&market=usdc": "Deposit",
  "/actions/lend/withdraw": "Withdraw",
  "/actions/lend/withdraw?market=gho&amount=1": "Withdraw",
  "/actions/multiply/multiply?multiplier=2&amount=1": "Multiply",
  "/actions/multiply/deleverage?multiplier=1.5&amount=1": "Deleverage",
  "/actions/rewards/claim": "Claim",
}

export const LIGHTHOUSE_ONBOARDING_MARKER = "This risk-free Avana Sandbox lets you borrow against practice LP positions"

export const CHROME_FLAGS = "--headless --no-sandbox --disable-dev-shm-usage --disable-gpu"
