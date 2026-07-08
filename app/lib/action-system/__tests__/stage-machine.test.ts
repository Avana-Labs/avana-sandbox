import { describe, expect, it } from "vitest"
import {
  isConfigureVisibleStage,
  isReviewStage,
  nextActionStage,
  primaryCtaLabel,
  reviewStageTitle,
  secondaryCtaLabel,
} from "@/app/lib/action-system/stage-machine"

describe("nextActionStage", () => {
  it("walks the happy path from select through success with review", () => {
    expect(nextActionStage("select", "continue")).toBe("configure")
    expect(nextActionStage("configure", "review")).toBe("review")
    expect(nextActionStage("review", "submit")).toBe("wallet_sign")
    expect(nextActionStage("wallet_sign", "signed")).toBe("processing")
    expect(nextActionStage("processing", "success")).toBe("success")
  })

  it("routes allowance before wallet sign", () => {
    expect(nextActionStage("review", "submit")).toBe("wallet_sign")
    expect(nextActionStage("approve_allowance", "allowance_complete")).toBe("wallet_sign")
  })

  it("routes errors", () => {
    expect(nextActionStage("wallet_sign", "error")).toBe("error")
    expect(nextActionStage("processing", "error")).toBe("error")
  })

  it("supports back navigation between stages", () => {
    expect(nextActionStage("review", "back")).toBe("configure")
    expect(nextActionStage("configure", "back")).toBe("select")
    expect(nextActionStage("wallet_sign", "back")).toBe("review")
  })

  it("resets from terminal stages back to configure", () => {
    expect(nextActionStage("success", "reset")).toBe("configure")
    expect(nextActionStage("error", "reset")).toBe("configure")
  })
})

describe("configure visibility", () => {
  it("keeps configure UI visible during wallet and allowance stages", () => {
    expect(isConfigureVisibleStage("configure")).toBe(true)
    expect(isConfigureVisibleStage("approve_allowance")).toBe(true)
    expect(isConfigureVisibleStage("wallet_sign")).toBe(true)
    expect(isConfigureVisibleStage("error")).toBe(true)
    expect(isConfigureVisibleStage("review")).toBe(false)
    expect(isConfigureVisibleStage("processing")).toBe(false)
    expect(isConfigureVisibleStage("success")).toBe(false)
  })

  it("identifies review stage", () => {
    expect(isReviewStage("review")).toBe(true)
    expect(isReviewStage("configure")).toBe(false)
  })
})

describe("primaryCtaLabel", () => {
  it("uses Review on configure when valid", () => {
    expect(
      primaryCtaLabel({
        stage: "configure",
        verb: "Borrow",
        blockedReason: null,
        isValid: true,
      }),
    ).toBe("Review")
  })

  it("uses verb on review stage", () => {
    expect(
      primaryCtaLabel({
        stage: "review",
        verb: "Borrow",
        blockedReason: null,
        isValid: true,
      }),
    ).toBe("Borrow")
  })

  it("turns a block into a short, in-place CTA label", () => {
    expect(
      primaryCtaLabel({
        stage: "configure",
        verb: "Borrow",
        blockedReason: "Insufficient balance",
        isValid: false,
      }),
    ).toBe("Insufficient balance")

    // With a symbol present the label is a {symbol} placeholder key — the ticker is
    // interpolated at render (after translation) so the label localizes.
    expect(
      primaryCtaLabel({
        stage: "configure",
        verb: "Deposit",
        blockedReason: "Insufficient wallet balance.",
        isValid: true,
        blockedSymbol: "USDC",
      }),
    ).toBe("Insufficient {symbol}")

    expect(
      primaryCtaLabel({
        stage: "configure",
        verb: "Borrow",
        blockedReason: "You have no collateral in this market yet.",
        isValid: false,
      }),
    ).toBe("Deposit collateral first")
  })

  it("shows validation label for invalid entered amounts", () => {
    expect(
      primaryCtaLabel({
        stage: "configure",
        verb: "Borrow",
        blockedReason: null,
        isValid: false,
        amountEntered: true,
      }),
    ).toBe("Enter a valid amount")
  })
})

describe("secondaryCtaLabel", () => {
  it("uses Back on review and configure when applicable", () => {
    expect(secondaryCtaLabel("review")).toBe("Back")
    expect(secondaryCtaLabel("configure", { canGoBack: true })).toBe("Back")
    expect(secondaryCtaLabel("configure", { canGoBack: false })).toBe("Cancel")
    expect(secondaryCtaLabel("success")).toBe("Done")
  })
})

describe("reviewStageTitle", () => {
  it("formats review titles from verbs", () => {
    expect(reviewStageTitle("Borrow")).toBe("Review borrow")
    expect(reviewStageTitle("Deposit")).toBe("Review deposit")
  })
})
