# Deploy hygiene: committed .next-prod build has the auth gate baked OPEN

**Priority:** HIGH · **Area:** infra

**Problem:** The committed `.next-prod` artifact was built with test mode on — decompiled chunks inline `IS_OPEN_GATE_TEST_MODE=true`, `TEST_MODE_WALLET_ADDRESS=0x…0a11`, and `NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210`. Shipping it = full SIWE/onboarding bypass (every visitor auth'd as the test wallet) + dead Convex.

**Where:** `app/lib/test-mode.ts`, `app/components/sandbox/sandbox-gate.tsx:~74`, `.env.local`, `.next-prod/`.

**Fix:** CI builds with `NODE_ENV=production` and `NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE` unset; assert the flag inlines `false` and the Convex URL is `*.convex.cloud`; delete/gitignore the poisoned artifact.
