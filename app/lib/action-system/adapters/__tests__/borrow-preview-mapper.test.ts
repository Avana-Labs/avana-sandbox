import { describe, expect, it } from "vitest"
import { parseFixed } from "@/app/lib/credit-engine"
import { mapBorrowTransactionPreviewToActionUi } from "@/app/lib/action-system/adapters/borrow-preview-mapper"

describe("borrow preview mapper", () => {
  it("maps engine preview into human-readable action metrics", () => {
    const preview = {
      allowed: true,
      warnings: [],
      validationErrors: [],
      riskLabel: "safe" as const,
      intent: {
        id: "intent-1",
        actionType: "borrow" as const,
        walletId: "wallet-1",
        amountUsd6: parseFixed("1", 6),
        requestedAt: Date.now(),
        simulated: true,
      },
      before: {
        collateralValueUsd6: parseFixed("3.48", 6),
        borrowCapacityUsd6: parseFixed("2.90", 6),
        availableBorrowCapacityUsd6: parseFixed("2.90", 6),
        totalBorrowedUsd6: parseFixed("0", 6),
        currentLtvWad: parseFixed("0", 18),
        healthFactorWad: parseFixed("2.9", 18),
      },
      after: {
        collateralValueUsd6: parseFixed("3.48", 6),
        borrowCapacityUsd6: parseFixed("2.90", 6),
        availableBorrowCapacityUsd6: parseFixed("1.90", 6),
        totalBorrowedUsd6: parseFixed("1", 6),
        currentLtvWad: parseFixed("0.28", 18),
        healthFactorWad: parseFixed("2.9", 18),
      },
    }

    const ui = mapBorrowTransactionPreviewToActionUi(preview, {
      symbol: "USDT",
      amountUsd: 1,
      marketLabel: "Main · Core",
      ratePct: 2.78,
      balanceLabel: "Available to Borrow",
      balanceUsd: 2.87,
    })

    expect(ui.amountUsdLabel).toBe("≈ $1.00")
    expect(ui.metrics.some((row) => row.label === "Health factor" && row.value === "2.90")).toBe(true)
    expect(ui.networkFeeLabel).toBe("~ $0.04")
    expect(ui.metrics.some((row) => row.value.includes("→"))).toBe(true)
  })
})
