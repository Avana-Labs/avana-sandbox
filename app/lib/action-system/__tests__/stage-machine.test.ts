import { describe, expect, it } from "vitest"
import { nextActionStage, primaryCtaLabel, shouldShowWalletToast } from "@/app/lib/action-system/stage-machine"

describe("action stage machine", () => {
  it("moves select to configure on continue", () => {
    expect(nextActionStage("select", "continue")).toBe("configure")
  })

  it("moves configure to submitting on submit", () => {
    expect(nextActionStage("configure", "submit")).toBe("submitting")
  })

  it("uses action verb as primary CTA on configure", () => {
    expect(primaryCtaLabel({ stage: "configure", verb: "Borrow", blockedReason: null, isValid: true })).toBe("Borrow")
  })

  it("shows wallet toast only while submitting", () => {
    expect(shouldShowWalletToast("submitting")).toBe(true)
    expect(shouldShowWalletToast("configure")).toBe(false)
  })
})
