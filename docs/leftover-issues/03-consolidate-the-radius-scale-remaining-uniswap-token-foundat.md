# Consolidate the radius scale (remaining Uniswap-token foundation)

**Priority:** HIGH · **Area:** ui

**Problem:** 12+ arbitrary pixel radii (`rounded-[20px]`, `[12px]`, `[18px]`, `[14px]`, `[10px]`, `[3px]`…) plus `rounded-2xl` ×26 coexist with the 4 radius tokens (`radius-xs/sm/md/lg` in `tailwind.config.js`). No consistent corner language.

**Expected:** All radii snap to the token scale.

**Fix:** Map arbitrary radii to `rounded-radius-*` tokens (or extend the scale with one `radius-xl` if 20px is needed as the card standard) and replace across `app/` + `components/`.
