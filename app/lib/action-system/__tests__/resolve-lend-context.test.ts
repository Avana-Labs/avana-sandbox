import { describe, expect, it } from "vitest"
import { lendDepositSelectItems } from "@/app/lib/action-system/resolve-lend-context"
import { buildMockLendSystemState } from "@/app/lib/lend-system/mock"

describe("resolve lend context", () => {
  it("only lists deposit assets held in the connected wallet", () => {
    const session = { state: buildMockLendSystemState("demo-wallet") }
    const items = lendDepositSelectItems(session, "demo-wallet")

    expect(items.map((item) => item.symbol).sort()).toEqual(["ETH", "USDC", "USDT"])
    expect(items.find((item) => item.symbol === "USDC")?.sublabel).toBe("Stable · Core")
    expect(items.some((item) => item.symbol === "cbBTC")).toBe(false)
  })
})
