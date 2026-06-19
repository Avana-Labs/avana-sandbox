import { describe, expect, it } from "vitest"
import { parseFixed } from "@/app/lib/credit-engine"
import { mapTransactionHistoryToActivityRows } from "@/app/lib/borrow-system/read-model"

describe("mapTransactionHistoryToActivityRows", () => {
  it("maps borrow history into portfolio activity rows with simulated labels", () => {
    const rows = mapTransactionHistoryToActivityRows([
      {
        id: "history-1",
        intentId: "intent-1",
        walletId: "demo-wallet",
        marketId: "uni-v3-bluechip-weth-usdc",
        assetId: "uni-v3-bluechip:usdc",
        kind: "borrow",
        status: "success",
        requestedAmountUsd6: parseFixed("250", 6),
        executedAmountUsd6: parseFixed("250", 6),
        simulated: true,
        timestamp: Date.UTC(2026, 5, 19),
        hash: "sim_abc123",
      },
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]?.kind).toBe("borrow")
    expect(rows[0]?.txHash).toBe("sim_abc123")
    expect(rows[0]?.secondaryLabel).toContain("Simulated")
    expect(rows[0]?.amountUsd).toBeLessThan(0)
  })
})
