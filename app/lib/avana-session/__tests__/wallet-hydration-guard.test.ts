import { describe, expect, it } from "vitest"
import { shouldApplyHydration } from "../wallet-hydration-guard"

const snap = (intentIds: Array<string | undefined | null>) => ({
  transactions: intentIds.map((intentId) => ({ intentId })),
})

describe("shouldApplyHydration (WalletHydrator in-flight guard, H19)", () => {
  it("does not apply while the query is still loading (undefined)", () => {
    expect(shouldApplyHydration(undefined, [])).toBe(false)
  })

  it("applies a snapshot when the client has no local intents", () => {
    expect(shouldApplyHydration(snap(["a", "b"]), [])).toBe(true)
  })

  it("applies when every local intent is reflected in the snapshot", () => {
    expect(shouldApplyHydration(snap(["a", "b", "c"]), ["a", "b"])).toBe(true)
  })

  it("SKIPS a stale re-emit that is missing an in-flight optimistic intent", () => {
    // The user just submitted "c" (optimistic, local) but this emit predates its write —
    // applying it would clobber the in-flight edit.
    expect(shouldApplyHydration(snap(["a", "b"]), ["a", "b", "c"])).toBe(false)
  })

  it("applies once the write lands and the emit finally contains the intent", () => {
    expect(shouldApplyHydration(snap(["a", "b", "c"]), ["a", "b", "c"])).toBe(true)
  })

  it("ignores snapshot rows with no intentId when matching", () => {
    // A seed/legacy row without an intentId can't satisfy a pending local intent.
    expect(shouldApplyHydration(snap([undefined, "a"]), ["a"])).toBe(true)
    expect(shouldApplyHydration(snap([undefined]), ["a"])).toBe(false)
  })
})
