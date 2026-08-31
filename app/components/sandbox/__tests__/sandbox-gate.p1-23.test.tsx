import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("SandboxGate first paint", () => {
  it("p1-23: pre-hydration shell SSRs onboarding only for cookieless guests, never for maybe-signed-in", () => {
    const source = readFileSync(resolve(__dirname, "../sandbox-gate.tsx"), "utf8")
    expect(source).toMatch(/if \(!hydrated\)/)
    // The !hydrated branch may SSR the onboarding hero ONLY for a visitor with no auth-hint cookie
    // (authHint === "guest") — they have never signed in on this browser, so there is no onboarded
    // session to flash, and it gives guests a fast LCP. Anyone who MIGHT be signed in keeps the
    // neutral ProductRoutePending shell (no welcome flicker) until SIWE hydrates.
    const hydratedBlock = source.split("if (!hydrated)")[1]?.split("if (!isSignedIn || !authedWallet)")[0] ?? ""
    expect(hydratedBlock).toMatch(/authHint === "guest"/)
    expect(hydratedBlock).toMatch(/<ProductRoutePending/)
    // GuestOnboardingFlow must appear only inside the authHint === "guest" guard, never before it.
    const beforeGuestGuard = hydratedBlock.split('authHint === "guest"')[0] ?? ""
    expect(beforeGuestGuard).not.toMatch(/<GuestOnboardingFlow/)
  })

  it("does not block signed-in pages on the deferred wallet SDK", () => {
    const source = readFileSync(resolve(__dirname, "../sandbox-gate.tsx"), "utf8")
    expect(source).not.toMatch(/useWalletGate/)
    expect(source).not.toMatch(/walletActive/)
  })
})
