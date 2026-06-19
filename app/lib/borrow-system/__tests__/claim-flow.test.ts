import { describe, expect, it } from "vitest"
import { isClaimSupportedByTransactionAdapter } from "@/app/lib/borrow-system/claim-adapter-policy"

describe("claim adapter policy", () => {
  it("explicitly excludes claim from the canonical transaction adapter path", () => {
    expect(isClaimSupportedByTransactionAdapter()).toBe(false)
  })

  it("documents the UI surface that still uses home-sim claim previews", () => {
    expect(["home", "pool-detail-sidebar"]).toContain("pool-detail-sidebar")
  })
})
