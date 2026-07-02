# Action-page hydration mismatch (aria-haspopup dialog vs listbox)

**Priority:** MEDIUM · **Area:** ui

**Problem:** Console logs a hydration mismatch on the action-page "Change asset" button — server renders `aria-haspopup="dialog"`, client `aria-haspopup="listbox"` (×8). React bails on patching; also an a11y drift. (The related NaN-risk-score error was already fixed.)

**Where:** `app/components/action-page/action-amount-card.tsx` (asset selector button).

**Fix:** Compute `aria-haspopup` deterministically so SSR and client agree.
