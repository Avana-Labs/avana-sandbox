import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DashboardWalletTab } from "@/app/dashboard/dashboard-wallet-tab"

vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("@/app/lib/currency/use-currency", () => ({
  useCurrency: () => ({ exact: (value: number) => `$${value.toFixed(2)}` }),
}))

describe("DashboardWalletTab", () => {
  it("renders wallet tokens and LPs separately", () => {
    render(<DashboardWalletTab walletId="demo-wallet" />)

    expect(screen.getByRole("heading", { name: "Wallet" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Tokens" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Pools" })).toBeInTheDocument()
    expect(screen.getAllByText("Ether").length).toBeGreaterThan(0)
    expect(screen.getAllByText("ETH / USDC LP").length).toBeGreaterThan(0)
  })

  it("links swappable token rows to the canonical swap route", () => {
    render(<DashboardWalletTab walletId="demo-wallet" />)

    const links = screen.getAllByRole("link", { name: "Swap" }).map((link) => link.getAttribute("href"))

    expect(links).toContain("/swap?origin=wallet&return=%2Fdashboard%3Ftab%3Dwallet&from=eth")
  })

  it("shows pool status and disables unsupported pool actions", () => {
    render(<DashboardWalletTab walletId="demo-wallet" />)

    expect(screen.getAllByText("In range").length).toBeGreaterThan(0)
    screen.getAllByRole("button", { name: "View" }).forEach((button) => expect(button).toBeDisabled())
  })

  it("can render live session balances passed by the dashboard", () => {
    render(
      <DashboardWalletTab
        walletId="wallet-live"
        balances={[
          { id: "live-usdc", walletId: "wallet-live", assetId: "usdc", amount: 123, sourceType: "wallet" },
        ]}
      />,
    )

    expect(screen.getAllByText("USD Coin").length).toBeGreaterThan(0)
    expect(screen.getAllByText("123 USDC").length).toBeGreaterThan(0)
  })
})
