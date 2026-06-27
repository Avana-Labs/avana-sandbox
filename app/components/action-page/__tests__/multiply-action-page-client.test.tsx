import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"
import { MultiplyActionPageClient } from "@/app/components/action-page/multiply-action-page-client"

describe("MultiplyActionPageClient", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it("does not show transaction preview metrics before a multiply amount is entered", async () => {
    render(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="multiply" />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("action-amount-card")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("action-metrics-block")).not.toBeInTheDocument()
    expect(screen.queryByTestId("action-risk-banner")).not.toBeInTheDocument()
    expect(screen.getByText("≈ $0.00")).toBeInTheDocument()
  })

  it("clamps the leverage multiplier to the selected market public maximum", async () => {
    render(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="multiply" initialMarketId="aave-gho" initialMultiplier="10" />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("5.4x")).toBeInTheDocument()
    })
  })

  it("defaults deleverage to the wallet's live position and a lower target multiplier", async () => {
    render(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="deleverage" />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("ETH collateral · borrow USDT")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument()
    })

    expect(screen.getByText("1.5x")).toBeInTheDocument()
  })

  it("completes deleverage from the default route without crashing", async () => {
    render(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="deleverage" />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Review" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Deleverage" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Deleverage" }))

    await waitFor(
      () => {
        expect(screen.getByText("Deleverage successful")).toBeInTheDocument()
      },
      { timeout: 8000 },
    )
  })
})
