import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AssetTokenActions } from "@/app/borrow/_detail/sidebars/AssetTokenSidebar"
import { PoolBorrowActions } from "@/app/borrow/_detail/sidebars/PoolBorrowSidebar"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { selectBorrowCollateralPools } from "@/app/lib/borrow-system/selectors"

const createIntent = vi.fn()
const previewTransaction = vi.fn()
const executeTransaction = vi.fn()
const walletId = "demo-wallet"
const previewState = buildMockBorrowSystemState(walletId)
const previewPool = selectBorrowCollateralPools(previewState, walletId).find((entry) => entry.id === "uni-v3-bluechip-weth-usdc")!
const pool = {
  ...previewPool,
}

const assetDetail = {
  id: "uni-v3-bluechip:usdc",
  hero: {
    symbol: "USDC",
    name: "USD Coin",
    visual: { iconUrl: "/asset.svg" },
  },
  row: {
    id: "uni-v3-bluechip:usdc",
    marketIds: [pool.id],
    borrowApr: 4.2,
    spokeLabel: "Uniswap V3 Bluechip",
  },
  quickStats: [],
  about: { title: "About", body: "About USDC" },
} as never

const poolDetail = {
  id: pool.id,
  hero: {
    name: pool.name,
    visuals: [
      { symbol: "WETH", shortLabel: "WETH", iconUrl: "/weth.svg" },
      { symbol: "USDC", shortLabel: "USDC", iconUrl: "/usdc.svg" },
    ],
  },
  about: { title: "About", body: "About pool" },
} as never

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}))

vi.mock("@/app/borrow/_detail/ui", () => ({
  AboutNewsSection: () => null,
}))

vi.mock("@/app/components/home-workspace-primitives", () => ({
  PairVisual: () => <div />,
}))

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/app/components/home/remove-card", () => ({
  CompactRemoveCard: ({ onSubmit }: { onSubmit: () => void }) => (
    <button type="button" onClick={onSubmit}>
      Review removal
    </button>
  ),
}))

vi.mock("@/app/components/home/claim-card", () => ({
  CompactClaimCard: () => <div>claim-card</div>,
}))

vi.mock("@/app/components/home/repay-card", () => ({
  CompactRepayCard: ({
    onAmountChange,
    onSubmit,
  }: {
    onAmountChange: (value: string) => void
    onSubmit: () => void
  }) => (
    <button
      type="button"
      onClick={() => {
        onAmountChange("150")
        onSubmit()
      }}
    >
      Review repayment
    </button>
  ),
}))

vi.mock("@/app/borrow/components/borrow-modal", () => ({
  BorrowModal: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: (result: { pool: typeof pool; token: { id: string }; amountUsd: number }) => void
  }) =>
    open ? (
      <button type="button" onClick={() => onConfirm({ pool, token: { id: "uni-v3-bluechip:usdc" }, amountUsd: 250 })}>
        confirm-borrow
      </button>
    ) : null,
}))

vi.mock("@/app/borrow/components/repay-remove-modal", () => ({
  RepayRemoveModal: ({
    open,
    context,
    onConfirm,
  }: {
    open: boolean
    context: { mode: "repay" | "remove"; pool: typeof pool } | null
    onConfirm: (result: { mode: "repay" | "remove"; pool: typeof pool; amountUsd: number }) => void
  }) =>
    open && context ? (
      <button type="button" onClick={() => onConfirm({ mode: context.mode, pool, amountUsd: 150 })}>
        {context.mode === "repay" ? "confirm-repay" : "confirm-remove"}
      </button>
    ) : null,
}))

vi.mock("@/app/borrow/components/supply-collateral-modal", () => ({
  SupplyCollateralModal: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: (result: { pool: typeof pool; amountUsd: number }) => void
  }) =>
    open ? (
      <button type="button" onClick={() => onConfirm({ pool, amountUsd: 300 })}>
        confirm-supply
      </button>
    ) : null,
}))

vi.mock("@/app/lib/borrow-system/use-borrow-session", () => ({
  useBorrowSession: () => {
    const state = buildMockBorrowSystemState(walletId)
    const collateralPools = selectBorrowCollateralPools(state, walletId)
    const collateralPool = collateralPools.find((entry) => entry.id === "uni-v3-bluechip-weth-usdc") ?? collateralPools[0]!

    return {
      state,
      marketSummaries: [
        {
          id: collateralPool.id,
          name: collateralPool.name,
          venue: collateralPool.venue,
          feeTier: collateralPool.category,
          tvlUsd: collateralPool.collateralUsd,
          spoke: "uni-v3-bluechip",
          ltv: collateralPool.maxLtv,
          dexes: [],
          borrowableTokens: [],
          aprMin: collateralPool.pairApr,
          aprMax: collateralPool.pairApr,
          availableUsd: collateralPool.borrowPowerUsd,
          riskPremiumBps: 25,
          visuals: [
            { symbol: "WETH", shortLabel: "WETH", bgClassName: "bg-black", textClassName: "text-white", iconUrl: "/weth.svg" },
            { symbol: "USDC", shortLabel: "USDC", bgClassName: "bg-blue-500", textClassName: "text-white", iconUrl: "/usdc.svg" },
          ],
          collateralExampleUsd: collateralPool.collateralUsd,
          trendUp: true,
        },
      ],
      collateralPools: [collateralPool],
      initialDebts: { [collateralPool.id]: 500 },
      getBorrowableAssetsForMarket: () => [
        {
          id: "uni-v3-bluechip:usdc",
          name: "USD Coin",
          symbol: "USDC",
          subtitle: "Stablecoin",
          borrowApr: 4.2,
          totalBorrowedUsd: 1000,
          utilization: 40,
          availableUsd: 9000,
          walletBalanceLabel: "$10,000",
          hasWalletBalance: true,
          visual: {
            symbol: "USDC",
            shortLabel: "USDC",
            bgClass: "bg-blue-500",
            textClass: "text-white",
          },
          trendUp: true,
          category: "stable",
        },
      ],
      createIntent,
      previewTransaction,
      executeTransaction,
    }
  },
}))

describe("detail sidebars", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createIntent.mockImplementation((action) => ({ id: `intent-${action.type}`, payload: action }))
    previewTransaction.mockImplementation(async (intent) => ({ allowed: true, intent }))
    executeTransaction.mockResolvedValue({ preview: { allowed: true }, receipt: {}, result: {}, historyItem: {}, state: {} })
  })

  it("routes asset sidebar borrow, repay, and gated supply actions through transaction adapters", async () => {
    render(<AssetTokenActions detail={assetDetail} />)

    fireEvent.click(screen.getByText("Borrow"))
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "250" } })
    fireEvent.click(screen.getByText("Review borrow"))
    fireEvent.click(screen.getByText("confirm-borrow"))

    fireEvent.click(screen.getByText("Repay"))
    fireEvent.click(screen.getByText("Review repayment"))
    fireEvent.click(screen.getByText("confirm-repay"))

    fireEvent.click(screen.getAllByText("Deposit")[1]!)
    fireEvent.click(screen.getByText("confirm-supply"))

    await waitFor(() => expect(createIntent).toHaveBeenCalledTimes(3))
    expect(previewTransaction).toHaveBeenCalledTimes(3)
    expect(executeTransaction).toHaveBeenCalledTimes(3)
  })

  it("routes pool sidebar pledge and remove actions through transaction adapters", async () => {
    render(<PoolBorrowActions detail={poolDetail} />)

    fireEvent.click(screen.getByText("Review pledge"))
    fireEvent.click(screen.getByText("confirm-supply"))

    fireEvent.click(screen.getByText("Remove"))
    fireEvent.click(screen.getByText("Review removal"))
    fireEvent.click(screen.getByText("confirm-remove"))

    await waitFor(() => expect(createIntent).toHaveBeenCalledTimes(2))
    expect(previewTransaction).toHaveBeenCalledTimes(2)
    expect(executeTransaction).toHaveBeenCalledTimes(2)
  })
})
