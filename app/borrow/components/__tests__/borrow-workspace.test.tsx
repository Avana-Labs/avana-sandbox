import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { BorrowWorkspace } from "@/app/borrow/components/borrow-workspace"

const push = vi.fn()
const createIntent = vi.fn()
const previewTransaction = vi.fn()
const executeTransaction = vi.fn()

const market = {
  id: "uni-v3-bluechip-weth-usdc",
  name: "WETH / USDC",
  venue: "Uniswap",
  feeTier: "0.05%",
  tvlUsd: 1000000,
  spoke: "uni-v3-bluechip",
  ltv: 70,
  dexes: [],
  borrowableTokens: [],
  aprMin: 2,
  aprMax: 4,
  availableUsd: 500000,
  riskPremiumBps: 25,
  visuals: [
    { symbol: "WETH", shortLabel: "WETH", bgClassName: "bg-black", textClassName: "text-white", iconUrl: "/weth.svg" },
    { symbol: "USDC", shortLabel: "USDC", bgClassName: "bg-blue-500", textClassName: "text-white", iconUrl: "/usdc.svg" },
  ],
  collateralExampleUsd: 12000,
  trendUp: true,
}

const asset = {
  id: "uni-v3-bluechip:usdc",
  name: "USD Coin",
  symbol: "USDC",
  subtitle: "Stablecoin",
  borrowApr: 4.2,
  visual: {
    symbol: "USDC",
    shortLabel: "USDC",
    bgClass: "bg-blue-500",
    textClass: "text-white",
  },
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/app/lib/page-loading", () => ({
  triggerPageLoading: vi.fn(),
}))

vi.mock("@/app/lib/use-media-query", () => ({
  useMediaQuery: () => true,
}))

vi.mock("@/app/lib/avana-session/avana-sessions-provider", () => ({
  useBorrowSessionContext: () => ({
    state: buildMockBorrowSystemState("wallet-1"),
    marketSummaries: [market],
    collateralPools: [
      {
        id: market.id,
        name: market.name,
        venue: market.venue,
        category: market.feeTier,
        collateralUsd: 12000,
        maxLtv: 70,
        borrowPowerUsd: 8400,
        liquidationUsd: 9000,
        pairApr: 3.1,
        visuals: [
          { symbol: "WETH", shortLabel: "WETH", bgClassName: "bg-black", textClassName: "text-white" },
          { symbol: "USDC", shortLabel: "USDC", bgClassName: "bg-blue-500", textClassName: "text-white" },
        ],
      },
    ],
    initialDebts: { [market.id]: 0 },
    getBorrowableAssetsForMarket: () => [asset],
    createIntent,
    previewTransaction,
    executeTransaction,
  }),
}))

vi.mock("@/app/borrow/components/tabs-bar", () => ({
  TabsBar: () => <div data-testid="tabs-bar" />,
  isPoolTab: () => true,
}))

vi.mock("@/app/borrow/components/collateral-pools-table", () => ({
  CollateralPoolsTable: ({
    onUseAsCollateral,
    onBorrowAssetMobile,
  }: {
    onUseAsCollateral: (pool: typeof market) => void
    onBorrowAssetMobile: (asset: typeof asset) => void
  }) => (
    <div>
      <button type="button" onClick={() => onUseAsCollateral(market)}>
        open-supply
      </button>
      <button type="button" onClick={() => onBorrowAssetMobile(asset)}>
        open-borrow
      </button>
    </div>
  ),
  CollateralPoolsList: () => null,
}))

describe("BorrowWorkspace", () => {
  it("routes supply and borrow actions to the shared action pages", () => {
    render(
      <BorrowWorkspace
        pageData={{
          walletId: "wallet-1",
          borrowSessionSeed: "{}",
          poolCatalog: [market],
          borrowableAssets: [asset],
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
        }}
      />,
    )

    fireEvent.click(screen.getByText("open-supply"))
    expect(push).toHaveBeenCalledWith("/actions/borrow/supply?market=uni-v3-bluechip-weth-usdc")

    fireEvent.click(screen.getByText("open-borrow"))
    expect(push).toHaveBeenCalledWith(
      "/actions/borrow/borrow?market=uni-v3-bluechip-weth-usdc&asset=uni-v3-bluechip%3Ausdc",
    )
  })
})
