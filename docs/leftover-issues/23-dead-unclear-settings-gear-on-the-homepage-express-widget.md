# Dead/unclear Settings gear on the homepage express widget

**Priority:** MEDIUM · **Area:** ui

**Problem:** The express widget's Settings gear appeared to open nothing in earlier testing (no dialog/menu). The code (`app/components/home/home-workspace-card.tsx`) does define a "Workspace settings" Dialog, so this needs re-verification: either the homepage uses a different card without the dialog, or the click isn't wired.

**Fix:** Re-verify; wire the gear to a real settings/slippage popover, or remove it.
