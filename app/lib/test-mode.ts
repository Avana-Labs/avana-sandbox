/**
 * Dev "open gate" shortcut — auto-injects TEST_MODE_WALLET_ADDRESS, skips the onboarding/auth
 * gate, and serves mock data, so you can iterate on the app without connecting a wallet.
 *
 * ── SAFETY: it can NEVER activate in a production build ──────────────────────────────────────
 * Every `next build` (local `npm run start`, Vercel, and every deploy) runs with
 * NODE_ENV="production". `isProductionBuild()` below makes `shouldUseOpenGateSession()`
 * hard-return `false` there, REGARDLESS of any env flag. So the open gate is structurally
 * impossible to ship — there is nothing to remember to "comment out" before deploying, and no
 * env var (even if mis-set in Vercel) can force it on in production.
 *
 * ── ENABLE IT (local only) ───────────────────────────────────────────────────────────────────
 * Set `NEXT_PUBLIC_DEV_OPEN_GATE=1` in `.env.local` (gitignored → never committed, never on
 * GitHub). Every `npm run dev` then opens the gate. Set it to `0` (or comment the line) to
 * exercise the REAL onboarding/auth flow on the dev server. The Playwright e2e suite opts in
 * separately via `NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE=1` on its own dev server.
 */

/** Hard floor: the open gate is impossible in any production build (all deploys are prod). */
function isProductionBuild(): boolean {
  return process.env.NODE_ENV === "production"
}

/** Explicit local opt-in for day-to-day coding. Set in `.env.local` (gitignored). */
export function isDevOpenGateEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEV_OPEN_GATE === "1"
}

/** e2e opt-in — Playwright sets this on its dev server (see playwright.config.ts). */
export function isPlaywrightTestMode(): boolean {
  return process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === "1"
}

export function shouldUseOpenGateSession(): boolean {
  if (isProductionBuild()) return false
  return isDevOpenGateEnabled() || isPlaywrightTestMode()
}

export function shouldUseMockDataSource(): boolean {
  return shouldUseOpenGateSession() || process.env.AVANA_DATA_SOURCE === "mock"
}

export const IS_DEV_SHORTCUT_MODE = shouldUseOpenGateSession()
export const IS_OPEN_GATE_TEST_MODE = IS_DEV_SHORTCUT_MODE

export const TEST_MODE_WALLET_ADDRESS =
  "0x0000000000000000000000000000000000000a11"
