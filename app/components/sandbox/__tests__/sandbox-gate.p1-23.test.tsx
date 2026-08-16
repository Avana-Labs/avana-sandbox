import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("SandboxGate first paint", () => {
  it("p1-23: pre-hydration shell is not GuestOnboardingFlow", () => {
    const source = readFileSync(resolve(__dirname, "../sandbox-gate.tsx"), "utf8")
    expect(source).toMatch(/if \(!hydrated\)/)
    // The !hydrated branch must not mount GuestOnboardingFlow (welcome flicker) —
    // it renders nothing until SIWE hydrates. The top page-loading bar carries
    // the "something is happening" signal; no ad-hoc pulses in the page body.
    const hydratedBlock = source.split("if (!hydrated)")[1]?.split("if (isSignedIn && !walletActive)")[0] ?? ""
    expect(hydratedBlock).not.toMatch(/<GuestOnboardingFlow/)
  })
})
