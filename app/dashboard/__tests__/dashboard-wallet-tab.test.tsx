import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { DashboardWalletTab } from "@/app/dashboard/dashboard-wallet-tab"

vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("@/app/lib/currency/use-currency", () => ({
  useCurrency: () => ({ exact: (value: number) => `$${value.toFixed(2)}` }),
}))

// The wallet tab now consults Convex for balances when no explicit prop is passed.
// The isolated test render doesn't mount a ConvexProvider, so stub the hook to
// return undefined — the tab falls through to the DEMO_SWAP_BALANCES default.
vi.mock("@/app/lib/swap-system/use-convex-wallet-balances", () => ({
  useConvexWalletBalances: () => undefined,
  useConvexProductWalletBalances: () => undefined,
}))

function renderWalletTab(node: ReactNode) {
  return render(<DisplayPreferencesProvider>{node}</DisplayPreferencesProvider>)
}

describe("DashboardWalletTab", () => {
  it("renders wallet tokens and LPs separately", { timeout: 20_000 }, () => {
    renderWalletTab(<DashboardWalletTab walletId="demo-wallet" />)

    expect(screen.getByRole("heading", { name: "Wallet Balance" })).toBeInTheDocument()
    expect(screen.getByText("Wallet Value")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Tokens" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Pools" })).toBeInTheDocument()
    expect(screen.getAllByText("Ether").length).toBeGreaterThan(0)
    expect(screen.getAllByText("ETH / USDC LP").length).toBeGreaterThan(0)
  })

  it("renders wallet balances without row-level swap actions", { timeout: 20_000 }, () => {
    renderWalletTab(<DashboardWalletTab walletId="demo-wallet" />)

    expect(screen.queryByRole("link", { name: "Swap" })).toBeNull()
  })

  it("shows pool status without row-level pool action buttons", { timeout: 20_000 }, () => {
    renderWalletTab(<DashboardWalletTab walletId="demo-wallet" />)

    // Fabricated "In range" LP status removed — honesty over invented analytics.
    expect(screen.queryByText("In range")).toBeNull()
    expect(screen.queryByRole("button", { name: "View" })).toBeNull()
  })

  it("can render live session balances passed by the dashboard", { timeout: 20_000 }, () => {
    renderWalletTab(
      <DashboardWalletTab
        walletId="wallet-live"
        balances={[{ id: "live-usdc", walletId: "wallet-live", assetId: "usdc", amount: 123, sourceType: "wallet" }]}
      />,
    )

    expect(screen.getAllByText("USD Coin").length).toBeGreaterThan(0)
    expect(screen.getAllByText("123 USDC").length).toBeGreaterThan(0)
  })

  it("excludes product-committed buckets — those live on their own tabs", { timeout: 20_000 }, () => {
    renderWalletTab(
      <DashboardWalletTab
        walletId="wallet-live"
        balances={[
          { id: "free-usdc", walletId: "wallet-live", assetId: "usdc", amount: 300, sourceType: "wallet" },
          {
            id: "available-lp",
            walletId: "wallet-live",
            assetId: "eth-usdc-lp",
            amount: 5.6,
            valueUsd: 700,
            sourceType: "borrow_collateral_unpledged",
          },
          {
            id: "pledged-lp",
            walletId: "wallet-live",
            assetId: "eth-usdc-lp",
            amount: 0.8,
            valueUsd: 100,
            sourceType: "borrow_collateral_pledged",
          },
        ]}
      />,
    )

    // Only the free wallet USDC shows; borrow collateral/pledged belong to the Borrow tab.
    expect(screen.getAllByText("USD Coin").length).toBeGreaterThan(0)
    expect(screen.queryByText("Borrow collateral")).toBeNull()
    expect(screen.queryByText("Pledged collateral")).toBeNull()
  })
})
