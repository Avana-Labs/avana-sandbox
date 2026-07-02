import { cleanup, render, screen } from "@testing-library/react"
import { getFunctionName } from "convex/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// hasConvexClient is decided at module load from NEXT_PUBLIC_CONVEX_URL; force it true so
// the provider mounts its Convex-backed subtree (where freshness is surfaced).
vi.mock("@/app/lib/convex/market-liquidity-provider", () => ({ hasConvexClient: true }))

// Route each useQuery by its function path (convex refs are NOT identity-stable, so we
// can't compare by reference). getPriceStatus drives the freshness signal.
const statusResult = { current: undefined as unknown }
vi.mock("convex/react", () => ({
  useQuery: (ref: unknown) => {
    const name = getFunctionName(ref as never)
    const value = name === "prices:getPriceStatus" ? statusResult.current : []
    // Convex's real useQuery re-throws server errors during render; model that so we can
    // assert the provider's error boundary keeps a prices outage from crashing the app.
    if (value instanceof Error) throw value
    return value
  },
}))

import { TokenPricesProvider, usePriceFreshness } from "@/app/lib/prices/token-prices-context"

function Probe() {
  const { stale, updatedAt } = usePriceFreshness()
  return (
    <div>
      <span data-testid="stale">{String(stale)}</span>
      <span data-testid="updatedAt">{String(updatedAt)}</span>
    </div>
  )
}

function renderWithStatus(status: unknown) {
  statusResult.current = status
  render(
    <TokenPricesProvider>
      <Probe />
    </TokenPricesProvider>,
  )
}

afterEach(() => {
  cleanup()
  statusResult.current = undefined
})

describe("usePriceFreshness", () => {
  it("does not flag stale while the status query is still loading", () => {
    renderWithStatus(undefined)
    expect(screen.getByTestId("stale").textContent).toBe("false")
  })

  it("reflects a fresh oracle (not stale)", () => {
    renderWithStatus({ stale: false, updatedAt: 1_700_000_000_000, ageMs: 1000 })
    expect(screen.getByTestId("stale").textContent).toBe("false")
    expect(screen.getByTestId("updatedAt").textContent).toBe("1700000000000")
  })

  it("flags staleness when the cron has stalled", () => {
    renderWithStatus({ stale: true, updatedAt: 1_600_000_000_000, ageMs: 99_999_999 })
    expect(screen.getByTestId("stale").textContent).toBe("true")
  })

  it("degrades to defaults (no crash) when the status query errors", () => {
    // Reproduces the live incident: `getPriceStatus` missing on a stale Convex deploy, so
    // useQuery re-throws. The provider sits above the root gate, so without a boundary this
    // would escalate to the global "Something went wrong" screen. Assert children still
    // render with neutral freshness instead.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      renderWithStatus(new Error("[CONVEX Q(prices:getPriceStatus)] Server Error"))
      expect(screen.getByTestId("stale").textContent).toBe("false")
      expect(screen.getByTestId("updatedAt").textContent).toBe("null")
    } finally {
      errorSpy.mockRestore()
    }
  })
})
