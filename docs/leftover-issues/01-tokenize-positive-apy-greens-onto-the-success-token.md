# Tokenize positive/APY greens onto the success token

**Priority:** HIGH · **Area:** ui

**Problem:** Positive/APY values use ~4 different greens — `text-apy-positive` (`#047857` in `app/globals.css`), `text-emerald-400/-600` (multiply + dashboard tables), and `text-brand` (dashboard) — so the same "positive" meaning renders inconsistently and the dark-mode shades are often too dark.

**Where:** `app/globals.css` (`.text-apy-positive`), `app/borrow/borrow-page-hero.tsx`, `app/multiply/components/markets-table.tsx`, `app/multiply/components/explore-loops-markets-table.tsx`, `app/dashboard/components/borrow-tab/supplies-table.tsx`, `app/dashboard/dashboard-client.tsx`, and other `text-emerald-*` usages.

**Expected:** One green for "positive" everywhere, theme-aware.

**Fix:** Replace positive/APY greens with the existing `success` token (`text-success`). Grep `emerald` + `apy-positive` and migrate. The `--success` token already exists (light emerald-600 / dark emerald-400).
