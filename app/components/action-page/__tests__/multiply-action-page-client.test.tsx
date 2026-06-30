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
      expect(screen.getByText("1.8x")).toBeInTheDocument()
    })
  })

  it("keeps deleverage preview blank until the target multiplier changes", async () => {
    render(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="deleverage" />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole("slider", { name: "Leverage multiplier" })).toBeInTheDocument()
    })

    expect(screen.getByRole("slider", { name: "Leverage multiplier" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enter an amount" })).toBeDisabled()
    expect(screen.queryByTestId("action-metrics-block")).not.toBeInTheDocument()
    expect(screen.queryByTestId("action-risk-banner")).not.toBeInTheDocument()
  })

  it("keeps embedded deleverage preview blank while showing the default target multiplier", async () => {
    render(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="deleverage" embedded layout="home" initialMarketId="aave-gho" />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole("slider", { name: "Leverage multiplier" })).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: "Min" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Max" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enter an amount" })).toBeDisabled()
    expect(screen.queryByTestId("action-health-factor-card")).not.toBeInTheDocument()
    expect(screen.queryByTestId("action-metrics-block")).not.toBeInTheDocument()
  })

  it("uses the ruler max to produce a valid deleverage preview", async () => {
    render(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="deleverage" />
      </AvanaSessionsProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Max" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Review" }))

    fireEvent.click(screen.getByRole("button", { name: "Deleverage" }))

    await waitFor(
      () => {
        expect(screen.getByText("Deleverage successful")).toBeInTheDocument()
      },
      { timeout: 8000 },
    )
  })

  it("falls back to a usable market instead of dead-ending on an unknown id", async () => {
    render(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="multiply" initialMarketId="not-a-market" />
      </AvanaSessionsProvider>,
    )

    // No "Market unavailable" dead-end — the action renders against a catalog
    // market and offers the picker so the user can switch.
    await waitFor(() => {
      expect(screen.getByTestId("action-amount-card")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("action-not-found")).not.toBeInTheDocument()
  })
})
