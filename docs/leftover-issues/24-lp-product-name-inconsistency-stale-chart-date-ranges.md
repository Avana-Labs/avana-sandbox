# LP product-name inconsistency + stale chart date ranges

**Priority:** MEDIUM · **Area:** ui

**Problem:** The same LP pools are described three ways — "Uniswap v2 LPs" (borrow table heading), "constant-product LP tokens" (express picker), "concentrated liquidity NFT positions" (dashboard) — and the slug is `uni-v3-bluechip-*` under the "v2" heading. Also the lend/multiply "Supply & Utilization/Borrow" charts show Dec–Feb / Apr–Feb ranges while today is Jul and the headline chart shows the Jul range.

**Fix:** One canonical LP product name; align all chart date ranges to the same clock.
