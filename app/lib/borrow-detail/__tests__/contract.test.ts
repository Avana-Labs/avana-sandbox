import { describe, expect, it } from "vitest"
import { getAssetDetail, getPoolDetail, listAllAssetDetails, listAllPoolDetails } from "@/app/lib/borrow-detail"

describe("borrow detail contract", () => {
  it("resolves canonical and home-alias pool ids from the canonical borrow system", () => {
    expect(getPoolDetail("uni-v3-bluechip-weth-usdc")?.hero.name).toBe("WETH / USDC")
    expect(getPoolDetail("eth-usdc")?.hero.name).toBe("WETH / USDC")
    expect(listAllPoolDetails().length).toBeGreaterThan(5)
  })

  it("resolves spoke-bound borrowable detail pages as distinct product records", () => {
    const uniUsdc = getAssetDetail("uni-v3-stable:usdc")
    const curveUsdc = getAssetDetail("curve-stable:usdc")

    expect(uniUsdc?.hero.symbol).toBe("USDC")
    expect(curveUsdc?.hero.symbol).toBe("USDC")
    expect(uniUsdc?.id).toBe("uni-v3-stable:usdc")
    expect(curveUsdc?.id).toBe("curve-stable:usdc")
    expect(uniUsdc?.hero.subtitle).not.toBe(curveUsdc?.hero.subtitle)
    expect(uniUsdc?.row.id).not.toBe(curveUsdc?.row.id)
    expect(uniUsdc?.related.every((asset) => asset.id.startsWith("uni-v3-stable:"))).toBe(true)
    expect(curveUsdc?.related.every((asset) => asset.id.startsWith("curve-stable:"))).toBe(true)
    expect(listAllAssetDetails().length).toBe(64)
  })
})
