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

/**
 * A local production-equivalent audit artifact is isolated in its own output directory
 * and rejected in CI/Vercel. It exists solely for Lighthouse to measure product routes
 * without onboarding; deployment builds cannot opt into it.
 *
 * SECURITY: this must NEVER be reachable in a real production runtime. The audit vars are
 * NEXT_PUBLIC_ (baked into the client bundle), so without the NODE_ENV guard a bundle built
 * with them and deployed to a host that doesn't set VERCEL/CI (self-hosted Node, Docker) could
 * flip `isProductionBuild()` to false and auto-open the dev gate. The audit build/serve run under
 * NODE_ENV="production", so requiring NODE_ENV !== "production" here does NOT affect the local
 * audit — its routes render the static LighthouseAuditSurface via `isLighthouseAuditMode()`,
 * which is independent of the open-gate session.
 */
function isLocalLighthouseAuditBuild(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_LIGHTHOUSE_AUDIT_MODE === "1" &&
    process.env.NEXT_PUBLIC_LIGHTHOUSE_AUDIT_ARTIFACT === "1" &&
    !process.env.VERCEL &&
    !process.env.CI
  )
}

/** Hard floor: the open gate is impossible in every deploy build. */
function isProductionBuild(): boolean {
  return process.env.NODE_ENV === "production" && !isLocalLighthouseAuditBuild()
}

/** Explicit local opt-in for day-to-day coding. Set in `.env.local` (gitignored). */
export function isDevOpenGateEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEV_OPEN_GATE === "1"
}

/** e2e opt-in — Playwright sets this on its dev server (see playwright.config.ts). */
export function isPlaywrightTestMode(): boolean {
  return process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === "1"
}

/** Local Lighthouse route audit opt-in. It shares the production hard floor below. */
export function isLighthouseAuditMode(): boolean {
  return process.env.NEXT_PUBLIC_LIGHTHOUSE_AUDIT_MODE === "1"
}

export function shouldUseOpenGateSession(): boolean {
  if (isProductionBuild()) return false
  return isDevOpenGateEnabled() || isPlaywrightTestMode() || isLighthouseAuditMode()
}

/**
 * The dev open-gate session (fake wallet, skip SIWE) is INTENTIONALLY decoupled from the
 * mock data source. Open-gate now reads live Convex data against a shared dev wallet, so
 * dev work exercises the same reads/writes production users hit — no mock catalog overlay.
 * Mock data remains available for isolated unit/e2e work via an explicit AVANA_DATA_SOURCE.
 */
export function shouldUseMockDataSource(): boolean {
  return process.env.AVANA_DATA_SOURCE === "mock"
}

export const IS_DEV_SHORTCUT_MODE = shouldUseOpenGateSession()
export const IS_OPEN_GATE_TEST_MODE = IS_DEV_SHORTCUT_MODE

/** Same address as Convex seed `TEST_WALLET_ADDRESS` — open-gate JWT + seeded portfolio rows. */
export { TEST_WALLET_ADDRESS as TEST_MODE_WALLET_ADDRESS } from "@/app/lib/convex-seed/test-wallet"
