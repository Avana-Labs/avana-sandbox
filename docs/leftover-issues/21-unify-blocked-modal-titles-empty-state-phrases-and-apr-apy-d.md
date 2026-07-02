# Unify blocked-modal titles, empty-state phrases, and APR/APY + detail metric labels

**Priority:** MEDIUM · **Area:** ui

**Problem:** Copy drift: 4 block-modal titles ("That's more practice EURC…", "You don't have this asset…", "Action unavailable"), ≥5 empty/invalid-amount phrases ("Enter an amount" / "Enter a valid amount" / "Adjust amount" / "Enter an amount greater than zero"), "Borrow APR" (multiply detail) vs "Borrow APY" (lend detail), and different headline metrics / order across the three detail pages ("Total Supplied" vs "Total Value Locked").

**Fix:** One block-modal component + one empty-state phrase; one APR/APY convention; a shared detail-page metric spec (labels + order).
