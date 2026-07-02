# Rewards accounting: pending increases on claim; balance not durable

**Priority:** MEDIUM · **Area:** data

**Problem:** Clicking "Claim 25 AVA" moved balance 0→25 (correct) but "ready to claim" went 315→320 (up), reproduced again 1,090→1,095 — the pending total never decrements the claimed amount. Later a claimed 25 AVA reverted to 0 balance across navigations. (Positive: activity does unlock quests, 5/35→13/35.)

**Where:** `convex/sandbox/rewards.ts`, `app/rewards/*`, the rewards session store.

**Fix:** Correct the pending aggregation (subtract claimed) and persist the claimed balance.
