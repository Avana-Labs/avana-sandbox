# Add loading/error boundaries; guard multiply visuals[0/1]

**Priority:** MEDIUM · **Area:** ui

**Problem:** dashboard/portfolio have `error.tsx` but no `loading.tsx` (pop-in/layout shift); the three market-detail routes have neither. `app/multiply/markets/[marketId]/market-detail-client.tsx:~69` dereferences `detail.hero.visuals[0]/[1]` with no length guard → can throw with no boundary → white screen.

**Fix:** Add `loading.tsx` (skeleton) + `error.tsx` per route; guard the `visuals` array access.
