import { describe, expect, it } from "vitest"
import { lendSuccessMetrics } from "@/app/components/action-page/lend-action-page-client"

describe("lendSuccessMetrics", () => {
  it("reports the withdrawal received instead of the pre-action withdrawable balance", () => {
    const metrics = lendSuccessMetrics(
      [{ id: "withdrawable-balance", label: "Wallet withdrawable", value: "100 USDC" }],
      "withdraw",
      50,
      "USDC",
    )

    expect(metrics).toEqual([{ id: "withdrawable-balance", label: "Wallet received", value: "50 USDC" }])
  })
})
