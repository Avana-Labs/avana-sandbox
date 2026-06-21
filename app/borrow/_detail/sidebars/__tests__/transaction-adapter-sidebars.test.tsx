import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AssetTokenActions } from "@/app/borrow/_detail/sidebars/AssetTokenSidebar"
import { PoolBorrowActions } from "@/app/borrow/_detail/sidebars/PoolBorrowSidebar"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { selectBorrowCollateralPools } from "@/app/lib/borrow-system/selectors"

const createIntent = vi.fn()
const previewTransaction = vi.fn()
const executeTransaction = vi.fn()
const push = vi.fn()
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
    walletBalanceLabel: "$10,000",
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
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

vi.mock("@/app/components/action-page/action-page-launch-cta", () => ({
  ActionPageLaunchCta: ({ kind, label }: { kind: string; label?: string }) => (
    <a data-testid={`action-launch-${kind}`} href={`/actions/borrow/${kind}`}>
      {label ?? kind}
    </a>
  ),
}))

vi.mock("@/app/lib/avana-session/avana-sessions-provider", () => ({
  useBorrowSessionContext: () => {
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
  useLendSessionContext: () => ({
    walletId,
    state: { positions: {}, markets: {} },
    transactionHistory: [],
  }),
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

  it("links asset sidebar tabs to action pages", () => {
    render(<AssetTokenActions detail={assetDetail} />)

    expect(screen.getByTestId("action-launch-deposit")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Borrow"))
    expect(screen.getByTestId("action-launch-borrow")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Repay"))
    expect(screen.getByTestId("action-launch-repay")).toBeInTheDocument()
  })

  it("links pool sidebar pledge and remove tabs to action pages", () => {
    render(<PoolBorrowActions detail={poolDetail} />)

    expect(screen.getByTestId("action-launch-supply")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Remove" }))
    expect(screen.getByTestId("action-launch-remove")).toBeInTheDocument()
  })
})
