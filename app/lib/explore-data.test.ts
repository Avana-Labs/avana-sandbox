import { buildExploreSnapshot, EXPLORE_ITEMS_PER_PAGE } from "@/app/lib/explore-data"

describe("explore data snapshot", () => {
  it("builds stable market data for repeated renders", () => {
    expect(buildExploreSnapshot()).toEqual(buildExploreSnapshot())
  })

  it("keeps the all-pools list aligned with the per-protocol data", () => {
    const snapshot = buildExploreSnapshot()
    const protocolPoolCount = Object.entries(snapshot.protocols)
      .filter(([protocol]) => protocol !== "All Pools")
      .reduce((sum, [, pools]) => sum + pools.length, 0)

    expect(snapshot.protocols["All Pools"]).toHaveLength(protocolPoolCount)
    expect(snapshot.allPools).toHaveLength(protocolPoolCount)
    expect(snapshot.itemsPerPage).toBe(EXPLORE_ITEMS_PER_PAGE)
    expect(snapshot.protocols["Uniswap V3"].length).toBeGreaterThan(3)
  })
})
