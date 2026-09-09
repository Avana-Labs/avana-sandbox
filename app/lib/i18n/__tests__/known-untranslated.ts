/**
 * KNOWN_UNTRANSLATED — allowlist of `t("…")` source strings that do NOT yet resolve to a
 * real translation in at least one of the 13 non-English locales (they render the English
 * fallback for some viewers).
 *
 * SHRINK-ONLY ledger consumed by `key-parity-from-source.test.ts`:
 *   - Translate a key in ALL 13 locales → DELETE it here (the parity test then enforces it;
 *     leaving a fully-translated key here fails the stale-check).
 *   - A brand-new untranslated `t("…")` key → translate it everywhere OR add it here as a
 *     deliberate, reviewed exception.
 *
 * After the B2–B6 backfill this holds the residual: DeFi acronyms/brand tokens whose correct
 * localized form equals the English source (APY, TVL, Claim, 1D, …) plus the handful of
 * keys still awaiting a locale. Regenerated from actual coverage; it may only get shorter.
 */
export const KNOWN_UNTRANSLATED: readonly string[] = [
  // Wallet Overview tiles — new copy awaiting the locale backfill.
  "Wallet Overview",
  "Unrealized P/L",
  "Avana Boost",
  "Member since",
  // Per-collateral borrow-power utilization caption.
  "used",
  // Multiply Loop Positions — split Position column headers/captions.
  "Equity",
  "leverage",
  "debt",
  // Borrow "My Debts" table — column (i) help text.
  // Wallet tab — Tokens + Pools table column (i) help text.
  // Lend investments table — column (i) help text.
  // Borrow "My Collaterals" table — column (i) help text.
  // Multiply Positions table — redesigned column (i) help text + Value caption.
  "Exp.",
  // Multiply Balance — Interest Earned tile help text.
  // Umbrella hero — Weighted APY tile (i) help text.
  "{amount} in cooldown",
  "{count} positions",
  "{progress}/{target} {currency}",
  "1 Day",
  "1D",
  "6 Months",
  "Action",
  "Activity",
  "ALLOCATION",
  "APY",
  "Asset",
  "ASSET",
  "Assets",
  "Available to Borrow",
  "Breadcrumb",
  "CF",
  "Claim",
  "Claim {amount} AVA",
  "Code",
  "Collateral Value",
  "Cooldown",
  "Data",
  "Date",
  "Expiration",
  "Explorer",
  "Exposure",
  "Exposure · Net APY",
  "Health Factor",
  "Help",
  "HF",
  "In cooldown",
  "Lending",
  "Leverage",
  "Liq.",
  "Liquidator",
  "live mix",
  "Long",
  "Loop",
  "LOOP APY",
  "Loop Positions",
  "LP APR",
  "LT",
  "LTV",
  "Manage",
  "Multiply {name}",
  "Multiply TVL",
  "Net",
  "No",
  "Optimal",
  "optional",
  "P/L",
  "Parameter",
  "Pool",
  "pools",
  "Pools",
  "Position",
  "Position Value",
  "Premium",
  "PREMIUM",
  "Preview {product}",
  "Product",
  "Risk",
  "Sandbox",
  "See on Etherscan",
  "Short",
  "Source",
  "Stake",
  "Status",
  "Target",
  "Tokens",
  "Transaction receipt",
  "Transactions",
  "Trending",
  "TVL",
  "Txn",
  "Type",
  "Unstake",
  "was",
  "Website",
  "X",
  "Yield Generated",
  "equity",
  "exposure",
] as const
