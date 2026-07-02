# Add a shared formatPercent helper (one APY/percent decimal convention)

**Priority:** HIGH · **Area:** ui

**Problem:** APY/percent decimals are inconsistent — Lend shows 2dp (`0.49%`, `30.10%`) via `.toFixed(2)`, Borrow shows 1dp (`5.3%`), dashboard "Lending Opportunities" shows 1dp (`30.1%`). ~41 `toFixed(2)` vs ~13 `toFixed(1)` vs a few `toFixed(0)` with no shared helper.

**Where:** `app/lib/` formatters, `app/lend/components/*`, `app/borrow/*`, `app/multiply/*`, dashboard tables.

**Expected:** One convention (recommend 2dp for asset APYs, or a `formatPercent(value,{dp})` used everywhere).

**Fix:** Add `formatPercent` to the shared formatters and route all percent rendering through it.
