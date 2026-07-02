# Give /actions/* pages a real header (one action shell)

**Priority:** HIGH · **Area:** ui

**Problem:** The dedicated `/actions/lend/*`, `/actions/borrow/*`, `/actions/multiply/*` pages strip the site chrome — no logo / nav / search / wallet, just 5 unlabeled utility icons + an ✕ (`app/components/action-page/action-page-shell.tsx`). Uniswap keeps its full header on the swap. Jarring context switch.

**Expected:** Action pages keep the site header (or render as a proper modal over the app), consistent across all three products.

**Fix:** Wrap the action shell in the site header/chrome (or convert to a Dialog-based flow); one `ActionShell` used by lend/borrow/multiply.
