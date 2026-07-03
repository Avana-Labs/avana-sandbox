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

    expect(screen.getByText("$1,050 processed.")).toBeInTheDocument()
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

    const dialog = await screen.findByRole("dialog", { name: "Select a token" })
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

    // The collateral context renders the empty selector card, not a pre-selected pool.
    const selector = await screen.findByTestId("action-context-selector-card")
    expect(within(selector).getByText("0")).toBeInTheDocument()
    expect(within(selector).getByText("≈ $0")).toBeInTheDocument()

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
