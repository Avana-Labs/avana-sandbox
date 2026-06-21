import { afterEach, describe, expect, it, vi } from "vitest"
import { createUnsupportedSourceError } from "@/app/lib/data/core/source-runtime"
import type { LendReadAdapter } from "@/app/lib/lend-system/contracts"
import { fetchLendPage } from "@/app/lib/data/providers/lend"
import { createLendPageSource, liveLendPageAdapter, mockLendPageAdapter } from "./source"
import type { LendPageData } from "./types"

const lendPageFixture: LendPageData = {
  tokens: [],
  markets: [],
  activity: [],
  chartSeries: [],
  featuredAssets: {},
  featuredSequence: [],
  featuredSnapshots: [],
  assetGroups: [],
  marketRows: [],
}

describe("lend page source", () => {
  afterEach(() => {
    delete process.env.AVANA_DATA_SOURCE
  })

  it("delegates mock reads through the lend read adapter contract", async () => {
    const readLendPage = vi.fn().mockResolvedValue(lendPageFixture)
    const source = createLendPageSource({
      adapter: mockLendPageAdapter,
      walletId: "wallet-1",
      readAdapter: {
        mode: "sandbox",
        readLendPage,
        readMarkets: async () => [],
        readPortfolioLend: async () => ({}) as never,
        readWalletSnapshot: async () => ({}) as never,
      } satisfies LendReadAdapter,
    })

    const result = await source.getLendPageData()

    expect(readLendPage).toHaveBeenCalledWith("wallet-1")
    expect(result.data).toBe(lendPageFixture)
  })

  it("normalizes unimplemented live readers into an unsupported source error so fetch fallback still works", async () => {
    const source = createLendPageSource({
      adapter: liveLendPageAdapter,
      readAdapter: {
        mode: "production",
        readLendPage: async () => {
          throw new Error("Production lend read adapter is not implemented")
        },
        readMarkets: async () => [],
        readPortfolioLend: async () => ({}) as never,
        readWalletSnapshot: async () => ({}) as never,
      } satisfies LendReadAdapter,
    })

    await expect(source.getLendPageData()).rejects.toEqual(createUnsupportedSourceError(liveLendPageAdapter, "getLendPageData"))
  })

  it("lets fetchLendPage fall back from live to mock when the live lend reader is still unimplemented", async () => {
    process.env.AVANA_DATA_SOURCE = "live"

    const data = await fetchLendPage()

    expect(data.markets.length).toBeGreaterThan(0)
    expect(data.featuredSnapshots.length).toBeGreaterThan(0)
  })
})
