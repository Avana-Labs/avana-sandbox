# Homepage express + search polish (search modal, express affordance, mobile tab wrap)

**Priority:** HIGH · **Area:** ui

**Problems:**
1. Search opens as a dense pop-up modal; make it airier / Uniswap-style (clear section headers, badges) — `app/components/search-command.tsx`.
2. Express card lacks the circular swap-direction affordance between the two fields (Uniswap ↓) — `app/components/home/*`.
3. Mobile express tabs wrap — "Remove" orphans onto a 2nd line at 390px while the gear stays on line 1 — `app/components/home/home-workspace-card.tsx` tablist.

**Fix:** Tighten the search modal layout; add the direction affordance (or confirm it's not needed for borrow); make the tablist wrap gracefully or shrink so all 4 tabs + gear fit one row on mobile.
