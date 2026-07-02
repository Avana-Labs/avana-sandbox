# Audit mobile card surface treatments for consistency

**Priority:** MEDIUM · **Area:** ui

**Problem:** Across mobile, some cards are filled and some outlined; surfaces pick `bg-card` / `bg-surface-inset` / `bg-surface-raised` / hardcoded inconsistently. (Note: the express Collateral-outlined vs Borrow-filled two-tone matches Uniswap's Sell/Buy pattern and is intentional — exclude that.) The new palette tokens help but component choices still vary.

**Fix:** Define a single card treatment convention and audit components to use the right surface token.
