import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AvanaSessionProviders } from "../avana-session-providers"

const mocks = vi.hoisted(() => ({
  convexAuthenticated: false,
  siwe: {
    authedWallet: "0x1111111111111111111111111111111111111111",
    isSignedIn: true,
  },
}))

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isAuthenticated: mocks.convexAuthenticated,
    isLoading: !mocks.convexAuthenticated,
  }),
}))

vi.mock("@/app/lib/siwe/use-siwe-auth", () => ({
  useSiweAuth: () => mocks.siwe,
}))

vi.mock("@/app/lib/test-mode", () => ({
  shouldUseOpenGateSession: () => false,
  TEST_MODE_WALLET_ADDRESS: "0x2222222222222222222222222222222222222222",
}))

vi.mock("@/app/lib/convex/market-liquidity-provider", () => ({
  hasConvexClient: true,
  MarketLiquidityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/app/lib/avana-session/avana-sessions-provider", () => ({
  AvanaSessionsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="local-session">{children}</div>
  ),
  ConvexAvanaSessionsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="convex-session">{children}</div>
  ),
}))

describe("AvanaSessionProviders", () => {
  beforeEach(() => {
    mocks.convexAuthenticated = false
    mocks.siwe.isSignedIn = true
  })

  it("does not mount wallet queries before Convex confirms the SIWE token", () => {
    render(
      <AvanaSessionProviders>
        <div>App content</div>
      </AvanaSessionProviders>,
    )

    expect(screen.getByLabelText("Authenticating wallet session")).toBeInTheDocument()
    expect(screen.queryByTestId("convex-session")).not.toBeInTheDocument()
  })

  it("mounts the wallet session after Convex confirms authentication", () => {
    mocks.convexAuthenticated = true

    render(
      <AvanaSessionProviders>
        <div>App content</div>
      </AvanaSessionProviders>,
    )

    expect(screen.getByTestId("convex-session")).toHaveTextContent("App content")
  })
})
