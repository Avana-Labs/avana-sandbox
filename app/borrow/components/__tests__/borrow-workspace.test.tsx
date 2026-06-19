import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
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

vi.mock("@/app/lib/borrow-system/use-borrow-session", () => ({
  useBorrowSession: () => ({
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

vi.mock("@/app/borrow/components/borrow-modal", () => ({
  BorrowModal: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: (result: { pool: typeof market; token: typeof asset; amountUsd: number }) => void
  }) =>
    open ? (
      <button type="button" onClick={() => onConfirm({ pool: market, token: asset, amountUsd: 250 })}>
        confirm-borrow
      </button>
    ) : null,
}))

vi.mock("@/app/borrow/components/supply-collateral-modal", () => ({
  SupplyCollateralModal: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: (result: { pool: typeof market; amountUsd: number }) => void
  }) =>
    open ? (
      <button type="button" onClick={() => onConfirm({ pool: market, amountUsd: 500 })}>
        confirm-supply
      </button>
    ) : null,
}))

describe("BorrowWorkspace", () => {
  it("routes supply and borrow confirms through the transaction adapter", async () => {
    createIntent.mockImplementation((action) => ({ id: `intent-${action.type}`, payload: action }))
    previewTransaction.mockImplementation(async (intent) => ({ allowed: true, intent }))
    executeTransaction.mockResolvedValue({
      receipt: { id: "receipt-1", hash: "sim_1", status: "success", actionType: "borrow", simulated: true, timestamp: Date.now() },
      result: { id: "receipt-1", hash: "sim_1", status: "success", actionType: "borrow", simulated: true, timestamp: Date.now() },
      historyItem: { id: "history-1" },
      preview: { allowed: true },
      state: {},
    })

    render(
      <BorrowWorkspace
        pageData={
          {
            walletId: "demo-wallet",
            borrowSessionSeed: "seed",
            pendingRows: [],
            dexes: [],
          } as never
        }
      />,
    )

    fireEvent.click(screen.getByText("open-supply"))
    fireEvent.click(screen.getByText("confirm-supply"))
    fireEvent.click(screen.getByText("open-borrow"))
    fireEvent.click(screen.getByText("confirm-borrow"))

    expect(createIntent).not.toHaveBeenCalled()
  })
})
