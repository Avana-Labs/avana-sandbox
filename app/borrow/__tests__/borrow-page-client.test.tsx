import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { BorrowPageClient } from "@/app/borrow/borrow-page-client"
import type { BorrowPageData } from "@/app/lib/data/providers/borrow"

vi.mock("@/app/borrow/borrow-workspace-shell", () => ({
  BorrowWorkspaceShell: () => <div data-testid="borrow-workspace-shell" />,
}))

describe("BorrowPageClient", () => {
  it("renders fetched hero metrics and explore sections without recomputing them locally", () => {
    const pageData = {
      walletId: "wallet-1",
      borrowSessionSeed: "{\"stub\":true}",
      poolCatalog: [
        {
          id: "market-1",
          name: "WETH / USDC",
          venue: "Uniswap v3",
          feeTier: "0.30%",
          tvlUsd: 100_000_000,
          availableUsd: 25_000_000,
          change24hPct: 1.1,
          spoke: "uni-v3-bluechip",
          ltv: 78,
          dexes: [{ id: "uniswap", label: "Uniswap" }],
          borrowableTokens: [],
          aprMin: 4.7,
          aprMax: 5.9,
          riskPremiumBps: 70,
          visuals: [
            { symbol: "WETH", shortLabel: "W", bgClass: "bg-indigo-100", textClass: "text-indigo-700", iconUrl: "/weth.png" },
            { symbol: "USDC", shortLabel: "U", bgClass: "bg-sky-100", textClass: "text-sky-700", iconUrl: "/usdc.png" },
          ],
          collateralExampleUsd: 1000,
          trendUp: true,
        },
      ],
      heroMetrics: {
        totalTvlUsd: 327_400_000,
        totalCollateralUsd: 315_700_000,
        availableCreditUsd: 92_700_000,
        outstandingLoansUsd: 159_800_000,
        totalTvlChangePct: 2.03,
      },
      explore: {
        trendingCollateral: [],
        topMarkets: [
          {
            id: "market-1",
            name: "WETH / USDC",
            venue: "Uniswap v3",
            feeTier: "0.30%",
            tvlUsd: 100_000_000,
            availableUsd: 25_000_000,
            change24hPct: 1.1,
            spoke: "uni-v3-bluechip",
            ltv: 78,
            dexes: [{ id: "uniswap", label: "Uniswap" }],
            borrowableTokens: [],
            aprMin: 4.7,
            aprMax: 5.9,
            riskPremiumBps: 70,
            visuals: [
              { symbol: "WETH", shortLabel: "W", bgClass: "bg-indigo-100", textClass: "text-indigo-700", iconUrl: "/weth.png" },
              { symbol: "USDC", shortLabel: "U", bgClass: "bg-sky-100", textClass: "text-sky-700", iconUrl: "/usdc.png" },
            ],
            collateralExampleUsd: 1000,
            trendUp: true,
          },
        ],
        highApyPools: [],
      },
      borrowableAssets: [],
      pendingRows: [],
      dexes: [],
      collateralPools: [],
      initialDebts: {},
      borrowSnapshot: {
        totalBorrowedUsd: 0,
        availableCreditUsd: 0,
        totalCollateralUsd: 0,
        liquidationValueUsd: 0,
        healthFactor: null,
      },
    } as unknown as BorrowPageData

    render(<BorrowPageClient pageData={pageData} />)

    expect(screen.getByText("Total TVL")).toBeInTheDocument()
    expect(screen.getByText("$327.4M")).toBeInTheDocument()
    expect(screen.getByText("$315.7M")).toBeInTheDocument()
    expect(screen.getByText("$92.7M")).toBeInTheDocument()
    expect(screen.getByText("$159.8M")).toBeInTheDocument()
    expect(screen.getByText("+2.03%")).toBeInTheDocument()
    expect(screen.getByText("Top Markets")).toBeInTheDocument()
    expect(screen.getByTestId("borrow-workspace-shell")).toBeInTheDocument()
  })
})
