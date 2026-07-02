# Single source of truth for market numbers (cross-page + within-page consistency)

**Priority:** HIGH · **Area:** data

**Problem:** The same market shows different core numbers across and within pages:
- WETH/USDC TVL: Trending card `$437.8M` vs Explore table `$149.6M` vs detail chart headline `$255.00M` vs detail overview `$312.4M`.
- Max LTV: list/express/search `63.5%` vs detail `76.5%`.
- Risk premium: list `0.97%` vs detail `0.70%`. Borrow APY for one loan: `7.04%` (desktop) vs `7.66%` (mobile). Detail utilization `62.1%` doesn't match borrowed÷supplied (~16%).

**Cause:** Dual multiply catalogs (`app/lib/multiply-sim.ts` vs `app/lib/multiply-system/catalog.ts`) + per-surface recomputation + private formatters.

**Expected:** One market/economics source consumed by list, cards, detail (headline == overview), express, and search.

**Fix:** Single economics source + one formatter set; detail chart headline and overview stat must read the same value.
