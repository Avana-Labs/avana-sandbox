import { describe, expect, it } from "vitest"
import { getAssetDetail, getPoolDetail, listAllAssetDetails, listAllPoolDetails } from "@/app/lib/borrow-detail"

describe("borrow detail contract", () => {
  it("resolves canonical and home-alias pool ids from the canonical borrow system", () => {
    expect(getPoolDetail("uni-v3-bluechip-weth-usdc")?.hero.name).toBe("WETH / USDC")
    expect(getPoolDetail("eth-usdc")?.hero.name).toBe("WETH / USDC")
    expect(listAllPoolDetails().length).toBeGreaterThan(5)
  })

  it("resolves asset detail pages from canonical borrow assets", () => {
    expect(getAssetDetail("usdc")?.hero.symbol).toBe("USDC")
    expect(listAllAssetDetails().length).toBeGreaterThan(5)
  })
})
