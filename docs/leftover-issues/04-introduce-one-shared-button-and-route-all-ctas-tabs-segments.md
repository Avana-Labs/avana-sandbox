# Introduce one shared Button and route all CTAs/tabs/segments through it

**Priority:** HIGH · **Area:** ui

**Problem:** Multiple button/tab styles remain. The action-flow primary CTA is now unified via `app/components/action-page/action-cta.ts`, but it is NOT the shared `components/ui/button.tsx`, and the workspace tabs (Borrow/Repay/Claim/Remove; Deposit/Withdraw), list-page button pairs, `action-blocked-dialog` buttons and `onboarding-flow` buttons still roll their own. Uniswap uses one button system.

**Where:** `components/ui/button.tsx`, `app/components/action-page/action-cta.ts`, `app/components/action-page/action-workspace-tabs.tsx`, `app/components/action-page/action-blocked-dialog.tsx`, `app/components/sandbox/onboarding-flow.tsx`.

**Expected:** One `Button` (with `cta`/`compact` sizes + `brand`/`secondary` variants) drives every button; a shared segmented-control for tabs.

**Fix:** Fold `action-cta` sizes/variants into `Button`; migrate the remaining hand-rolled buttons and unify the tab/segment control so it matches the sticky-bar buttons.
