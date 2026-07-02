# Multiply Max fills market liquidity, not wallet balance

**Priority:** MEDIUM · **Area:** ui

**Problem:** On the multiply action, clicking "Max" filled 30,000 AAVE (~$8.4M — the market's available liquidity) for a ~$11K wallet. Lend's Max correctly uses the wallet balance. Users can enter unaffordable amounts.

**Where:** `app/components/action-page/multiply-action-page-client.tsx` (`maxCollateralAmount`/`collateralBalanceLabel` currently = market liquidity).

**Fix:** Max should use the wallet's collateral-token balance (capped by liquidity), and the label should say "Balance", not "Available liquidity".
