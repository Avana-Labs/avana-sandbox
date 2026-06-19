import { describe, expect, it } from "vitest"
import { canAdvanceStage, terminalStagesForAction } from "@/app/lib/borrow-system/action-box-contract"

describe("borrow action box contract", () => {
  it("uses preview-only stages for liquidation preview actions", () => {
    expect(terminalStagesForAction("liquidate-preview")).toEqual(["entry", "preview", "review"])
    expect(terminalStagesForAction("borrow")).toContain("success")
  })

  it("blocks review advancement when preview is disallowed", () => {
    expect(
      canAdvanceStage("borrow", "review", {
        allowed: false,
        riskLabel: "danger",
        validationErrors: ["blocked"],
        warnings: [],
        rows: [],
        ctaLabel: "Blocked",
        blockedReason: "blocked",
      }),
    ).toBe(false)
  })

  it("does not advance liquidation preview past review", () => {
    expect(
      canAdvanceStage("liquidate-preview", "review", {
        allowed: true,
        riskLabel: "danger",
        validationErrors: [],
        warnings: [],
        rows: [],
        ctaLabel: "Preview only",
        blockedReason: null,
      }),
    ).toBe(false)
  })
})
