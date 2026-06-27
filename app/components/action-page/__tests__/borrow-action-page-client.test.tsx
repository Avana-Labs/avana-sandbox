import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"
import { BorrowActionPageClient } from "@/app/components/action-page/borrow-action-page-client"

describe("BorrowActionPageClient", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it("shows the executed USD amount after a collateral removal", async () => {
    render(
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
    render(
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
})
