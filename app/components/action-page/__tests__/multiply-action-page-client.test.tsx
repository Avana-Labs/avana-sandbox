import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"
import { MultiplyActionPageClient } from "@/app/components/action-page/multiply-action-page-client"
import { buildMockMultiplySystemStateWithSeedPosition } from "@/app/lib/multiply-system/mock"
import {
  readMultiplySessionState,
  writeMultiplySessionMetadata,
  writeMultiplySessionState,
} from "@/app/lib/multiply-system/storage"
import { serializeMultiplySystemState } from "@/app/lib/multiply-system/codec"

const renderWithProviders = (ui: ReactNode) => render(<DisplayPreferencesProvider>{ui}</DisplayPreferencesProvider>)
const DEMO_WALLET_ID = "demo-wallet"

function seedExistingMultiplyPosition() {
  const state = buildMockMultiplySystemStateWithSeedPosition(DEMO_WALLET_ID)
  writeMultiplySessionState(DEMO_WALLET_ID, state)
  writeMultiplySessionMetadata(DEMO_WALLET_ID, {
    transactionHistory: [
      {
        id: "seeded-position-history",
        intentId: "seeded-position-intent",
        walletId: DEMO_WALLET_ID,
        marketId: "eth-usdt",
        kind: "multiply",
        status: "success",
        amountUsd: 3500,
        multiplierBefore: 1,
        multiplierAfter: 2,
        simulated: true,
        timestamp: state.now,
        hash: "sim-seeded-position",
      },
    ],
    receipts: [],
  })
}

describe("MultiplyActionPageClient", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it("does not show transaction preview metrics before a multiply amount is entered", async () => {
    renderWithProviders(
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
    renderWithProviders(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="multiply" initialMarketId="aave-gho" initialMultiplier="10" />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("1.8x")).toBeInTheDocument()
    })
  })

  it("previews a fresh-wallet multiply without merging a ghost position", async () => {
    renderWithProviders(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient
          kind="multiply"
          initialMarketId="eth-usdt"
          initialMultiplier="2"
        />
      </AvanaSessionsProvider>,
    )

    fireEvent.change(screen.getByLabelText("Collateral supplied amount"), { target: { value: "0.01" } })

    await waitFor(() => expect(screen.getByTestId("action-metrics-block")).toBeInTheDocument())
    expect(screen.getByLabelText("Collateral supplied amount")).toHaveValue("0.01")
    expect(screen.getByTestId("action-leverage-ruler")).toHaveTextContent("Target leverage")
    expect(screen.getByTestId("action-metrics-block")).toHaveTextContent("Collateral supplied")
    expect(screen.getByTestId("action-metrics-block")).toHaveTextContent("Target leverage")
    expect(screen.getByTestId("action-metrics-block")).toHaveTextContent("Looped exposure")
    expect(screen.getByTestId("action-metrics-block")).toHaveTextContent("USDT borrowed")
    expect(screen.getByTestId("action-metrics-block")).toHaveTextContent("Borrow capacity remaining")
    expect(screen.getByTestId("action-metrics-block")).not.toHaveTextContent("Projected exposure")
    expect(screen.queryByText(/0\.01.*2\.00x/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Review" }))

    await waitFor(() => expect(screen.getByTestId("action-review-stage")).toBeInTheDocument())
    expect(screen.getByTestId("action-review-stage")).toHaveTextContent("Collateral supplied")
    expect(screen.getByTestId("action-review-stage")).toHaveTextContent("0.01")
    expect(screen.getByTestId("action-review-stage")).toHaveTextContent("Target leverage")
    expect(screen.queryByText(/0\.01.*2\.00x/)).not.toBeInTheDocument()
  })

  it("rejects an absurd collateral amount and blocks Review", async () => {
    renderWithProviders(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="multiply" initialMarketId="eth-usdt" initialMultiplier="2" />
      </AvanaSessionsProvider>,
    )

    const input = await screen.findByLabelText("Collateral supplied amount")
    fireEvent.change(input, { target: { value: "999999999" } })

    // No crash, no projected metrics, and a clear over-liquidity rejection message.
    // The primary CTA is disabled (labelled "Adjust amount" when blocked).
    await waitFor(() => expect(screen.getByText(/exceeds your available balance/i)).toBeInTheDocument())
    expect(screen.queryByTestId("action-metrics-block")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Review" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adjust amount" })).toBeDisabled()

    // A within-cap amount is accepted and produces a live preview.
    fireEvent.change(input, { target: { value: "0.01" } })
    await waitFor(() => expect(screen.getByTestId("action-metrics-block")).toBeInTheDocument())
    expect(screen.queryByText(/exceeds your available balance/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Review" })).not.toBeDisabled()
  })

  it("fills the collateral input with the wallet-balance cap via Max", async () => {
    renderWithProviders(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="multiply" initialMarketId="eth-usdt" initialMultiplier="2" />
      </AvanaSessionsProvider>,
    )

    const input = (await screen.findByLabelText("Collateral supplied amount")) as HTMLInputElement
    // Scope to the amount card's Max button (the leverage ruler also has a "Max").
    const amountCard = within(screen.getByTestId("action-amount-card"))
    fireEvent.click(amountCard.getByRole("button", { name: "Max" }))

    // Max fills the wallet's spendable balance ($12,500 budget / ETH price), not the
    // pool's multi-million liquidity; the filled value must be within the cap so it
    // is not itself rejected.
    await waitFor(() => expect(input.value).not.toBe(""))
    expect(Number(input.value)).toBeGreaterThan(0)
    expect(screen.queryByText(/exceeds your available balance/i)).not.toBeInTheDocument()
  })

  it("keeps deleverage preview blank until the target multiplier changes", async () => {
    seedExistingMultiplyPosition()
    renderWithProviders(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="deleverage" />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole("slider", { name: "Target leverage multiplier" })).toBeInTheDocument()
    })

    expect(screen.getByRole("slider", { name: "Target leverage multiplier" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enter an amount" })).toBeDisabled()
    expect(screen.queryByTestId("action-metrics-block")).not.toBeInTheDocument()
    expect(screen.queryByTestId("action-risk-banner")).not.toBeInTheDocument()
  })

  it("keeps embedded deleverage preview blank while showing the default target multiplier", async () => {
    seedExistingMultiplyPosition()
    renderWithProviders(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="deleverage" embedded layout="home" initialMarketId="aave-gho" />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole("slider", { name: "Target leverage multiplier" })).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: "Min" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Max" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enter an amount" })).toBeDisabled()
    expect(screen.queryByTestId("action-health-factor-card")).not.toBeInTheDocument()
    expect(screen.queryByTestId("action-metrics-block")).not.toBeInTheDocument()
  })

  it("lets the deleverage slider move freely instead of snapping back to the default", async () => {
    seedExistingMultiplyPosition()
    renderWithProviders(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="deleverage" />
      </AvanaSessionsProvider>,
    )

    await screen.findByTestId("action-leverage-ruler")
    // Assert the controlled slider's own value (the state that drives the preview and
    // submission) rather than the animated headline text, which lags during transitions.
    const slider = screen.getByRole("slider", { name: "Target leverage multiplier" }) as HTMLInputElement
    // The 2.0x seed position defaults the target to max(1, 2 - 0.5) = 1.5x once.
    await waitFor(() => expect(slider.value).toBe("1.5"))

    // A mid-range value must persist. The frozen slider snapped every drag back to 1.5.
    fireEvent.change(slider, { target: { value: "1.2" } })
    await waitFor(() => expect(slider.value).toBe("1.2"))

    // Another value (both directions) also sticks.
    fireEvent.change(slider, { target: { value: "1.7" } })
    await waitFor(() => expect(slider.value).toBe("1.7"))

    // Min (→ 1x) is honored too.
    fireEvent.click(screen.getByRole("button", { name: "Min" }))
    await waitFor(() => expect(slider.value).toBe("1"))
  })

  it("uses the ruler max to produce a valid deleverage preview", async () => {
    seedExistingMultiplyPosition()
    renderWithProviders(
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

  it("fully closes a position from the deleverage view and removes it from state", async () => {
    seedExistingMultiplyPosition()
    renderWithProviders(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="deleverage" />
      </AvanaSessionsProvider>,
    )

    const closeButton = await screen.findByTestId("multiply-close-position")
    fireEvent.click(closeButton)

    await waitFor(
      () => {
        expect(screen.getByText("Position closed")).toBeInTheDocument()
      },
      { timeout: 8000 },
    )

    // The closed position is gone from the persisted session state (no zombie left).
    // The write to localStorage flushes shortly AFTER the "Position closed" stage renders,
    // so poll until it lands instead of reading once — a single synchronous read races the
    // async persist and flakes under load.
    await waitFor(() => {
      const persisted = readMultiplySessionState(
        DEMO_WALLET_ID,
        serializeMultiplySystemState({ now: 0, markets: {}, positions: {}, transactions: [] }),
      )
      expect(persisted.positions[`${DEMO_WALLET_ID}:eth-usdt`]).toBeUndefined()
    })
  })

  it("falls back to a usable market instead of dead-ending on an unknown id", async () => {
    renderWithProviders(
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
