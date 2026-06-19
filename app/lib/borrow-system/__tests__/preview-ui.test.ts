import { describe, expect, it } from "vitest"
import { parseFixed } from "@/app/lib/credit-engine"
import { mapPreviewToActionBoxUi } from "@/app/lib/borrow-system/preview-ui"

describe("preview ui mappers", () => {
  it("maps transaction preview metrics into action box rows", () => {
    const preview = {
      allowed: true,
      warnings: [],
      validationErrors: [],
      riskLabel: "safe" as const,
      intent: {
        id: "intent-1",
        actionType: "borrow" as const,
        walletId: "wallet-1",
        amountUsd6: parseFixed("100", 6),
        requestedAt: Date.now(),
        simulated: true,
      },
      before: {
        collateralValueUsd6: parseFixed("1000", 6),
        borrowCapacityUsd6: parseFixed("700", 6),
        availableBorrowCapacityUsd6: parseFixed("200", 6),
        totalBorrowedUsd6: parseFixed("500", 6),
        currentLtvWad: parseFixed("0.5", 18),
        healthFactorWad: parseFixed("2", 18),
      },
      after: {
        collateralValueUsd6: parseFixed("1000", 6),
        borrowCapacityUsd6: parseFixed("700", 6),
        availableBorrowCapacityUsd6: parseFixed("100", 6),
        totalBorrowedUsd6: parseFixed("600", 6),
        currentLtvWad: parseFixed("0.6", 18),
        healthFactorWad: parseFixed("1.7", 18),
      },
    }

    const ui = mapPreviewToActionBoxUi(preview)
    expect(ui.allowed).toBe(true)
    expect(ui.rows.some((row) => row.label === "Borrowed")).toBe(true)
    expect(ui.rows.some((row) => row.label === "Health factor")).toBe(true)
    expect(ui.ctaLabel).toBe("Continue")
  })
})
