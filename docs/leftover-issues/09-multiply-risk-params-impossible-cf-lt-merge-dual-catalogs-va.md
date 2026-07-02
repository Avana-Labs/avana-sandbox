# Multiply risk params impossible (CF > LT) — merge dual catalogs + validate LT>CF

**Priority:** HIGH · **Area:** data

**Problem:** AAVE/GHO shows Collateral Factor 70% but Liquidation Threshold 65% (CF > LT is impossible); CRV/CRVUSD shows CF 60% = LT 60%. Comes from two catalogs disagreeing (`multiply-sim.ts` ETH LT 0.83 vs catalog `eth-usdt` LT 0.80; leverage `1/(1-lt)` vs curated `publicMaxMultiplier`).

**Where:** `app/lib/multiply-system/catalog.ts`, `app/lib/multiply-sim.ts`, `app/lib/multiply-detail/index.ts`.

**Fix:** Merge to one catalog and assert `LT > CF` (and leverage ≤ theoretical) at seed time.
