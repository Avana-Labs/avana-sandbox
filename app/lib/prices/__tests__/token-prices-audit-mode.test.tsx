import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const { useQuery, testMode } = vi.hoisted(() => ({
  useQuery: vi.fn(),
  testMode: { audit: true, openGate: false },
}))

vi.mock("convex/react", () => ({ useQuery }))
vi.mock("@/app/lib/convex/market-liquidity-provider", () => ({
  hasConvexClient: true,
}))
vi.mock("@/app/lib/test-mode", () => ({
  isLighthouseAuditMode: () => testMode.audit,
  shouldUseOpenGateSession: () => testMode.openGate,
}))
vi.mock("@/app/lib/siwe/use-siwe-auth", () => ({
  useSiweAuth: () => ({ isSignedIn: true }),
}))

import { TokenPricesProvider } from "@/app/lib/prices/token-prices-context"

describe("TokenPricesProvider audit mode", () => {
  it("uses static labels without opening a live Convex subscription", () => {
    render(
      <TokenPricesProvider>
        <span>market content</span>
      </TokenPricesProvider>,
    )

    expect(screen.getByText("market content")).toBeInTheDocument()
    expect(useQuery).not.toHaveBeenCalled()
  })

  it("does not query Convex when the dev open gate uses local sessions", () => {
    testMode.audit = false
    testMode.openGate = true

    render(
      <TokenPricesProvider>
        <span>dev market content</span>
      </TokenPricesProvider>,
    )

    expect(screen.getByText("dev market content")).toBeInTheDocument()
    expect(useQuery).not.toHaveBeenCalled()
  })
})
