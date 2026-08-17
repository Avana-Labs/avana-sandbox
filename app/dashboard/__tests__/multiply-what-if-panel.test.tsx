import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import { MultiplyWhatIfPanel } from "@/app/dashboard/multiply-what-if-panel"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import type { MultiplyPosition, MultiplySystemState } from "@/app/lib/multiply-engine"
import { EXAMPLE_ETH_USDT_MARKET } from "@/app/lib/multiply-engine/__tests__/fixtures"

function renderPanel(state: MultiplySystemState, walletId: string | null) {
  return render(
    <DisplayPreferencesProvider>
      <MultiplyWhatIfPanel state={state} walletId={walletId} />
    </DisplayPreferencesProvider>,
  )
}

const market = EXAMPLE_ETH_USDT_MARKET

function makePosition(overrides: Partial<MultiplyPosition> = {}): MultiplyPosition {
  const collateralAmount = 2
  const debtValueUsd = collateralAmount * market.collateralAsset.priceUsd * 0.5
  return {
    id: "wallet-1:eth-usdt",
    walletId: "wallet-1",
    marketId: market.id,
    collateralAmount,
    collateralValueUsd: collateralAmount * market.collateralAsset.priceUsd,
    debtValueUsd,
    multiplier: 2,
    ltv: 0.5,
    healthFactor: 1.6,
    liquidationPrice: 900,
    netApy: 0.03,
    openedAt: 0,
    lastUpdatedAt: 0,
    ...overrides,
  }
}

function buildState(position: MultiplyPosition): MultiplySystemState {
  return {
    now: 0,
    markets: { [market.id]: market },
    positions: { [position.id]: position },
    walletBalancesUsd: { "wallet-1": {} },
    transactions: [],
  }
}

describe("MultiplyWhatIfPanel", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders nothing when the wallet has no open leveraged positions", () => {
    const state: MultiplySystemState = {
      now: 0,
      markets: { [market.id]: market },
      positions: {},
      walletBalancesUsd: { "wallet-1": {} },
      transactions: [],
    }
    const { container } = renderPanel(state, "wallet-1")
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the current scenario values at 0% price move", () => {
    const state = buildState(makePosition())
    renderPanel(state, "wallet-1")
    expect(screen.getByText(/What-if: price move/i)).toBeInTheDocument()
    expect(screen.getByText(/\+0\.0%/)).toBeInTheDocument()
  })

  it("degrades health factor and drops collateral value when the price slider moves down", () => {
    const state = buildState(makePosition())
    renderPanel(state, "wallet-1")
    const slider = screen.getByRole("slider", { name: /Collateral price move percentage/i })
    fireEvent.change(slider, { target: { value: "-20" } })
    expect(screen.getByText(/-20\.0%/)).toBeInTheDocument()
  })
})
