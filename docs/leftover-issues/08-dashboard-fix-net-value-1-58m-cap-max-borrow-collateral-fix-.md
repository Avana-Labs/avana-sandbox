# Dashboard: fix Net Value $1.58M, cap Max-Borrow ≤ collateral, fix position→row mismap

**Priority:** HIGH · **Area:** data

**Problem (Dashboard → Borrow tab):**
- "Net Value $1,578,716" next to $2K borrowed / $14.4K collateral — off by ~140×.
- Position 3 (WBTC/WETH): Collateral $2.1K but Max Borrow $3.7K (>170% LTV — impossible).
- Positions 2 & 3 shared identical HF/max-borrow; after borrowing against WBTC/WETH the new HF landed on the WETH/USDC row.

**Where:** `app/lib/data/providers/portfolio/map-portfolio-page.ts`, `app/lib/data/providers/portfolio/source.ts`.

**Fix:** Fix net-value aggregation, cap max-borrow at the per-market collateral factor, and fix the position→row mapping.
