# End-to-end UI/UX + code inspection pass (comprehensive QA)

**Priority:** HIGH · **Area:** qa

**Goal:** After the fixes above land, re-run a full end-to-end inspection and produce a prioritized report.

**Scope:**
- Drive every flow to completion at desktop (1440) + mobile (390), light + dark: Borrow, Lend, Multiply, Repay/Withdraw/Remove/Claim, Manage Positions, Rewards, homepage express.
- Verify data consistency (same numbers across list/card/detail/express/search/dashboard), transaction states (loading/empty/error/pending/success), receipts, and that failed/cancelled actions never create phantom positions.
- Check wallet states (connected/disconnected/wrong-network — note test mode forces connected), currency/language across all pages, mobile clipping/overflow, hydration & console errors.
- Compare polish vs Uniswap (typography, spacing, radii, buttons, modals, empty/error/skeleton states).
- Code review: component/token consistency, duplicated logic, decimal/BigInt precision, race conditions, stale cache, test coverage, test-mode/prod safety.

**Deliverable:** A prioritized (P0–P3) report with page/flow, repro, expected vs actual, why it matters, and suggested fix per item.
