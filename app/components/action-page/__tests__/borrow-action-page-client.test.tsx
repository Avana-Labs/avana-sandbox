import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"
import { BorrowActionPageClient } from "@/app/components/action-page/borrow-action-page-client"

// The action client now consults wagmi (via useWrongNetwork) to gate submission. These unit
// tests render it without a WagmiProvider, so stub the two hooks the guard uses; "disconnected"
// means isWrongNetwork=false, matching the sandbox flows these tests exercise.
vi.mock("wagmi", () => ({
  useAccount: () => ({ isConnected: false, chainId: undefined }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn(), isPending: false }),
}))

const renderWithProviders = (ui: ReactNode) => render(<DisplayPreferencesProvider>{ui}</DisplayPreferencesProvider>)

describe("BorrowActionPageClient", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it("P1-30 labels Remove input as a percent of the position", async () => {
    renderWithProviders(
      <AvanaSessionsProvider>
        <BorrowActionPageClient kind="remove" initialMarketId="uni-v3-bluechip-weth-usdc" initialAmount="25" />
      </AvanaSessionsProvider>,
    )

    expect(await screen.findByText("Percent of position")).toBeInTheDocument()
    expect(screen.getByLabelText("Percent of position amount")).toHaveValue("25")
    expect(screen.getByText("%")).toBeInTheDocument()
  })

  it("shows the executed USD amount after a collateral removal", async () => {
    renderWithProviders(
      <AvanaSessionsProvider>
        <BorrowActionPageClient kind="remove" initialMarketId="uni-v3-bluechip-weth-usdc" initialAmount="25" />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Review" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Remove" }))

    await waitFor(
      () => {
        expect(screen.getByText("Remove successful")).toBeInTheDocument()
      },
      { timeout: 8000 },
    )

    expect(screen.getByText("$1,050.00 processed.")).toBeInTheDocument()
  })

  it("starts Remove on the wallet collateral selector", async () => {
    renderWithProviders(
      <AvanaSessionsProvider>
        <BorrowActionPageClient kind="remove" />
      </AvanaSessionsProvider>,
    )

    expect(await screen.findByText("Choose collateral to remove.")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Search pools")).toBeInTheDocument()
    expect(screen.getAllByText("WETH / USDC").length).toBeGreaterThan(0)
    // Venue label is now the concise spoke label (e.g. "Uniswap v2 LPs"), suffixed with the
    // fee tier by formatBorrowMarketContext — match the DEX + fee without pinning the version.
    expect(screen.getAllByText(/Uniswap.*·\s*0\.30%/).length).toBeGreaterThan(0)
    expect(screen.queryByText("Choose the asset to borrow.")).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText("Find an asset")).not.toBeInTheDocument()
  })

  it("does not auto-select a debt from a market-only Repay URL", async () => {
    renderWithProviders(
      <AvanaSessionsProvider>
        <BorrowActionPageClient kind="repay" initialMarketId="uni-v3-bluechip-weth-usdc" />
      </AvanaSessionsProvider>,
    )

    expect(await screen.findByText("Choose the debt to repay.")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Find an asset")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Review" })).not.toBeInTheDocument()
  })

  it("keeps a token picker selection after closing the dialog", async () => {
    renderWithProviders(
      <AvanaSessionsProvider>
        <BorrowActionPageClient kind="borrow" initialMarketId="uni-v3-bluechip-weth-usdc" initialAssetId="usdc" />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Change asset, current USDC" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Change asset, current USDC" }))

    const dialog = await screen.findByRole("dialog", { name: "Choose asset to borrow" })
    expect(within(dialog).getByRole("button", { name: /Tether USD USDT/ })).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: /Tether USD USDT/ }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Change asset, current USDT" })).toBeInTheDocument()
    })
  })

  it("routes an unknown borrow market to the picker instead of dead-ending", async () => {
    renderWithProviders(
      <AvanaSessionsProvider>
        <BorrowActionPageClient kind="borrow" initialMarketId="not-a-market" />
      </AvanaSessionsProvider>,
    )

    // No "Market unavailable" dead-end — the user lands on the market/asset picker.
    await waitFor(() => {
      expect(screen.getByTestId("action-select-stage")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("action-not-found")).not.toBeInTheDocument()
  })

  it("boots the home borrow workspace at a true zero state (no pool, no value, no health factor)", async () => {
    renderWithProviders(
      <AvanaSessionsProvider walletId="home-demo-wallet">
        <BorrowActionPageClient kind="borrow" embedded layout="home" closeHref="/" />
      </AvanaSessionsProvider>,
    )

    // The collateral context renders the unified card in its empty state — value "0"
    // and "$0.00", not a pre-selected pool (same card shown once collateral exists).
    await waitFor(() => {
      expect(screen.getAllByText("0").length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0)

    // Nothing should auto-select a pledged pool or surface a health factor before
    // the user acts. Give effects a tick to (not) run, then assert the zero state held.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enter an amount" })).toBeInTheDocument()
    })
    expect(screen.queryByText("WETH / USDC")).not.toBeInTheDocument()
    expect(screen.queryByText(/\$4,2\d\d/)).not.toBeInTheDocument()
    expect(screen.queryByText(/health factor/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Review" })).not.toBeInTheDocument()
  })
})
