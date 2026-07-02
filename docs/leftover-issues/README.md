# Leftover issues
One file per issue, ready to file on GitHub (`Avana-Labs/avana-webapp`).
Run `./create-issues.sh` (needs `gh auth login`) to create them all, or hand the `.md` files to another agent.

| # | Priority | Area | Title |
|---|---|---|---|
| 01 | HIGH | ui | Tokenize positive/APY greens onto the success token |
| 02 | HIGH | ui | Add a shared formatPercent helper (one APY/percent decimal convention) |
| 03 | HIGH | ui | Consolidate the radius scale (remaining Uniswap-token foundation) |
| 04 | HIGH | ui | Introduce one shared Button and route all CTAs/tabs/segments through it |
| 05 | HIGH | ui | Give /actions/* pages a real header (one action shell) |
| 06 | HIGH | ui | Homepage express + search polish (search modal, express affordance, mobile tab wrap) |
| 07 | HIGH | data | Single source of truth for market numbers (cross-page + within-page consistency) |
| 08 | HIGH | data | Dashboard: fix Net Value $1.58M, cap Max-Borrow ≤ collateral, fix position→row mismap |
| 09 | HIGH | data | Multiply risk params impossible (CF > LT) — merge dual catalogs + validate LT>CF |
| 10 | HIGH | data | Borrow health-factor formula uses max-LTV instead of liquidation threshold |
| 11 | HIGH | data | Homepage express borrow can't be completed (LP picker $0; Repay wrong default asset) |
| 12 | HIGH | infra | Deploy hygiene: committed .next-prod build has the auth gate baked OPEN |
| 13 | MEDIUM | ui | Sticky CTA on /actions/* configure + review pages (mobile) |
| 14 | MEDIUM | data | Rewards accounting: pending increases on claim; balance not durable |
| 15 | MEDIUM | ui | Receipt deep-link renders an empty page |
| 16 | MEDIUM | ui | Action-page hydration mismatch (aria-haspopup dialog vs listbox) |
| 17 | MEDIUM | data | Dashboard portfolio hero flip-flops between tabs |
| 18 | MEDIUM | ui | Currency not applied everywhere; desktop currency is a cycling icon |
| 19 | MEDIUM | infra | Convex resilience: gate timeout, wrap mutations, reachable deployment |
| 20 | MEDIUM | ui | Add loading/error boundaries; guard multiply visuals[0/1] |
| 21 | MEDIUM | ui | Unify blocked-modal titles, empty-state phrases, and APR/APY + detail metric labels |
| 22 | MEDIUM | ui | Multiply Max fills market liquidity, not wallet balance |
| 23 | MEDIUM | ui | Dead/unclear Settings gear on the homepage express widget |
| 24 | MEDIUM | ui | LP product-name inconsistency + stale chart date ranges |
| 25 | MEDIUM | ui | Audit mobile card surface treatments for consistency |
| 26 | LOW | ui | Trending card shows an unlabeled 2nd $ metric |
| 27 | LOW | data | "Conservative Strategy" lists a 30% APY asset as low-risk |
| 28 | LOW | data | Withdraw review shows already-earned interest decreasing |
| 29 | LOW | data | Lend Avg Utilization is non-deterministic across loads |
| 30 | LOW | ui | Dashboard quick-action icons are inconsistently styled |
| 31 | LOW | infra | Coinbase Wallet SDK telemetry fires on every navigation |
| 32 | LOW | ui | Client refetches pop in without a skeleton |
| 33 | LOW | ui | Missing empty state (multiply) + unrendered portfolio error |
| 34 | LOW | ui | Wallet pill truncates to "TEST WAL…" |
| 35 | LOW | ui | Near-liquidation multiply shows only a soft "Caution" |
| 36 | LOW | ui | Copy/label nits: grammar + activity label |
| 37 | LOW | ui | Heading sizes bypass the globals h1/h2/h3 scale |
| 38 | LOW | data | Minor number drift: $16.12 vs $16.13; Average APY vs Net APY |
| 39 | HIGH | qa | End-to-end UI/UX + code inspection pass (comprehensive QA) |
