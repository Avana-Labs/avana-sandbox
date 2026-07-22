import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("dashboard referral ref param", () => {
  it("p1-12: invite links target dashboard referrals tab with ref query", () => {
    const adapter = readFileSync(resolve(__dirname, "../sandbox-action-adapter.ts"), "utf8")
    expect(adapter).toMatch(/\/dashboard\?tab=referrals&ref=\$\{buildReferralCode\(wallet\)\}/)
  })

  it("p1-12: dashboard client applies referral code from searchParams on mount", () => {
    const dashboard = readFileSync(resolve(__dirname, "../../../dashboard/dashboard-page-client.tsx"), "utf8")
    expect(dashboard).toMatch(/searchParams\.get\(["']ref["']\)/)
    expect(dashboard).toMatch(/applyReferralCode/)
  })
})
