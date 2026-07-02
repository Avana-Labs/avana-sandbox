# Homepage express borrow can't be completed (LP picker $0; Repay wrong default asset)

**Priority:** HIGH · **Area:** data

**Problem:** Home → Borrow → collateral picker lists every LP pool at `$0` / HF ∞, so you can't pledge; entering a borrow amount yields "Available…$0.00" → CTA "Adjust amount". Yet the Repay tab of the same widget shows "Collateral WETH/USDC ≈ $4,208" (matches the dashboard's $14.4K collateral) — the two tabs contradict each other. Repay also defaults the repay asset to WETH when the debt is USDC → dead-ends.

**Fix:** Feed the express LP picker the same collateral source as the dashboard/Repay tab; default the repay asset to the actually-borrowed asset.
