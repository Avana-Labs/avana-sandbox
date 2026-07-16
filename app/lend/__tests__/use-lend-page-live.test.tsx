import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useLendPageLive } from "@/app/lend/use-lend-page-live"

describe("useLendPageLive", () => {
  it("re-reads lend page data when lend session state changes", async () => {
    const readLendPage = vi
      .fn()
      .mockResolvedValueOnce({
        tokens: [],
        markets: [
          {
            symbol: "ETH",
            name: "Ethereum",
            apy: 3.82,
            apyChange24h: 0,
            tvl: "$103.2M",
            utilization: 61.33,
            type: "medium",
            protocol: "ETH",
            color: "",
            bg: "",
            soon: false,
            event: null,
          },
        ],
        activity: [],
        chartSeries: [],
        featuredAssets: {},
        featuredSequence: [],
        featuredSnapshots: [],
        assetGroups: [],
        marketRows: [
          {
            marketId: "eth",
            href: "/lend/markets/eth",
            asset: "ETH",
            assetName: "Ethereum",
            supplyApyLabel: "3.82%",
            rewardsApyLabel: "0.00%",
            totalApyLabel: "3.82%",
            totalSuppliedLabel: "$103.2M",
            availableLiquidityLabel: "$39.9M",
            utilizationLabel: "61.33%",
            reserveFactorLabel: "15.00%",
            status: "active",
            supplyApy: 0.0382,
            rewardsApy: 0,
            totalApy: 0.0382,
            totalSupplied: 31500,
            availableLiquidity: 12180,
            utilization: 0.6133,
            reserveFactor: 0.15,
          },
        ],
      })
      .mockResolvedValueOnce({
        tokens: [],
        markets: [
          {
            symbol: "ETH",
            name: "Ethereum",
            apy: 4.11,
            apyChange24h: 0,
            tvl: "$108.0M",
            utilization: 58.12,
            type: "medium",
            protocol: "ETH",
            color: "",
            bg: "",
            soon: false,
            event: null,
          },
        ],
        activity: [],
        chartSeries: [],
        featuredAssets: {},
        featuredSequence: [],
        featuredSnapshots: [],
        assetGroups: [],
        marketRows: [
          {
            marketId: "eth",
            href: "/lend/markets/eth",
            asset: "ETH",
            assetName: "Ethereum",
            supplyApyLabel: "4.11%",
            rewardsApyLabel: "0.00%",
            totalApyLabel: "4.11%",
            totalSuppliedLabel: "$108.0M",
            availableLiquidityLabel: "$45.2M",
            utilizationLabel: "58.12%",
            reserveFactorLabel: "15.00%",
            status: "active",
            supplyApy: 0.0411,
            rewardsApy: 0,
            totalApy: 0.0411,
            totalSupplied: 33000,
            availableLiquidity: 14900,
            utilization: 0.5812,
            reserveFactor: 0.15,
          },
        ],
      })

    const lendSession = {
      walletId: "demo-wallet",
      readAdapter: { readLendPage },
      state: { now: 1, markets: {}, positions: {}, transactions: [] },
      transactionHistory: [] as unknown[],
    }

    const { result, rerender } = renderHook(({ session }) => useLendPageLive("demo-wallet", session as never), {
      initialProps: { session: lendSession },
    })

    await waitFor(() => expect(result.current?.markets[0]?.apy).toBe(3.82))
    expect(readLendPage).toHaveBeenCalledTimes(1)

    rerender({
      session: {
        ...lendSession,
        transactionHistory: [{ id: "tx-1" }],
      },
    })

    await waitFor(() => expect(result.current?.markets[0]?.apy).toBe(4.11))
    expect(readLendPage).toHaveBeenCalledTimes(2)
  })
})
