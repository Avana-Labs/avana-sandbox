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
 * localized form equals the English source (APY, TVL, Umbrella, 1D, …) plus the handful of
 * keys still awaiting a locale. Regenerated from actual coverage; it may only get shorter.
 */
export const KNOWN_UNTRANSLATED: readonly string[] = [
  "{amount} in cooldown",
  "{count} positions",
  "{progress}/{target} {currency}",
  "1D",
  "Action",
  "ALLOCATION",
  "APY",
  "Asset",
  "ASSET",
  "Assets",
  "Breadcrumb",
  "CF",
  "Claim {amount} AVA",
  "Code",
  "Date",
  "Expiration",
  "Explorer",
  "Exposure",
  "Help",
  "HF",
  "Home",
  "Prices may be stale",
  "In cooldown",
  "Lending",
  "Leverage",
  "Liq.",
  "Liquidator",
  "live mix",
  "Long",
  "LOOP APY",
  "LP APR",
  "LT",
  "LTV",
  "Multiply",
  "Multiply {name}",
  "Multiply TVL",
  "Net",
  "Net APY",
  "No",
  "Optimal",
  "optional",
  "P/L",
  "Parameter",
  "Pool",
  "pools",
  "Pools",
  "Position",
  "Premium",
  "PREMIUM",
  "Preview {product}",
  "Product",
  "Sandbox",
  "Short",
  "Source",
  "Stake",
  "Status",
  "Swap",
  "Target",
  "Tokens",
  "Transactions",
  "Trending",
  "TVL",
  "Txn",
  "Type",
  "Umbrella",
  "Wallet",
  "was",
  "Website",
  "X",
] as const
