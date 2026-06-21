import { describe, expect, it } from "vitest"
import {
  isConfigureVisibleStage,
  nextActionStage,
  primaryCtaLabel,
  secondaryCtaLabel,
  shouldDisablePrimaryCta,
  shouldShowWalletToast,
  walletToastMessage,
} from "@/app/lib/action-system/stage-machine"

describe("nextActionStage", () => {
  it("walks the happy path from select through success", () => {
    expect(nextActionStage("select", "continue")).toBe("configure")
    expect(nextActionStage("configure", "submit")).toBe("wallet_sign")
    expect(nextActionStage("wallet_sign", "signed")).toBe("processing")
    expect(nextActionStage("processing", "success")).toBe("success")
  })

  it("routes allowance before wallet sign", () => {
    expect(nextActionStage("configure", "submit")).toBe("wallet_sign")
    expect(nextActionStage("approve_allowance", "allowance_complete")).toBe("wallet_sign")
  })

  it("routes hard blocks and errors", () => {
    expect(nextActionStage("configure", "block")).toBe("blocked")
    expect(nextActionStage("wallet_sign", "error")).toBe("error")
    expect(nextActionStage("processing", "error")).toBe("error")
  })

  it("resets from terminal stages back to configure", () => {
    expect(nextActionStage("success", "reset")).toBe("configure")
    expect(nextActionStage("error", "reset")).toBe("configure")
    expect(nextActionStage("blocked", "reset")).toBe("configure")
  })
})

describe("configure visibility", () => {
  it("keeps configure UI visible during wallet and allowance stages", () => {
    expect(isConfigureVisibleStage("configure")).toBe(true)
    expect(isConfigureVisibleStage("approve_allowance")).toBe(true)
    expect(isConfigureVisibleStage("wallet_sign")).toBe(true)
    expect(isConfigureVisibleStage("error")).toBe(true)
    expect(isConfigureVisibleStage("processing")).toBe(false)
    expect(isConfigureVisibleStage("success")).toBe(false)
    expect(isConfigureVisibleStage("blocked")).toBe(false)
  })
})

describe("primaryCtaLabel", () => {
  it("uses verb when valid", () => {
    expect(
      primaryCtaLabel({
        stage: "configure",
        verb: "Borrow",
        blockedReason: null,
        isValid: true,
      }),
    ).toBe("Borrow")
  })

  it("shows blocked reason and validation hints", () => {
    expect(
      primaryCtaLabel({
        stage: "configure",
        verb: "Borrow",
        blockedReason: "Insufficient balance",
        isValid: false,
      }),
    ).toBe("Insufficient balance")

    expect(
      primaryCtaLabel({
        stage: "configure",
        verb: "Borrow",
        blockedReason: null,
        isValid: false,
      }),
    ).toBe("Enter an amount")
  })
})

describe("wallet toast helpers", () => {
  it("shows allowance copy only on approve stage", () => {
    expect(shouldShowWalletToast("approve_allowance")).toBe(true)
    expect(shouldShowWalletToast("wallet_sign")).toBe(true)
    expect(shouldShowWalletToast("configure")).toBe(false)
  })

  it("formats wallet toast with amount label", () => {
    expect(walletToastMessage("wallet_sign", "1,000 USDC")).toContain("1,000 USDC")
    expect(walletToastMessage("approve_allowance", "50 GHO")).toContain("50 GHO")
    expect(walletToastMessage("approve_allowance", "50 GHO")).not.toBe(walletToastMessage("wallet_sign", "50 GHO"))
  })
})

describe("footer disable rules", () => {
  it("disables primary CTA while pending or signing", () => {
    expect(shouldDisablePrimaryCta({ stage: "configure", isValid: true, isPending: true })).toBe(true)
    expect(shouldDisablePrimaryCta({ stage: "wallet_sign", isValid: true, isPending: false })).toBe(true)
    expect(shouldDisablePrimaryCta({ stage: "configure", isValid: false, isPending: false })).toBe(true)
  })
})

describe("secondaryCtaLabel", () => {
  it("uses Done on success", () => {
    expect(secondaryCtaLabel("success")).toBe("Done")
    expect(secondaryCtaLabel("configure")).toBe("Cancel")
  })
})
