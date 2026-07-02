# Borrow health-factor formula uses max-LTV instead of liquidation threshold

**Priority:** HIGH · **Area:** data

**Problem:** `app/lib/data/providers/portfolio/source.ts:~300` computes `healthFactor = collateral * (maxLtv/100) / debt`. Correct is `collateral * liquidationThreshold / debt` (the canonical engine at `app/lib/credit-engine/metrics.ts:~93` already does this). Since LT > maxLTV, the dashboard/portfolio understates HF and disagrees with the action-modal HF. The correct `liquidationThresholdPct` is loaded a few lines above but unused.

**Fix:** Use the liquidation threshold in the portfolio HF calc.
