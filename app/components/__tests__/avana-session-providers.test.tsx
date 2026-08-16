import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AvanaSessionProviders } from "../avana-session-providers"

const mocks = vi.hoisted(() => ({
  convexAuthenticated: false,
  openGate: false,
  openGateReady: true,
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
  ConvexReactClient: class {
    constructor() {}
  },
  ConvexProviderWithAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/app/lib/siwe/use-siwe-auth", () => ({
  useSiweAuth: () => mocks.siwe,
  useConvexSiweAuth: () => ({ isLoading: false, isAuthenticated: false, fetchAccessToken: async () => null }),
}))

vi.mock("@/app/lib/siwe/use-open-gate-auth-bootstrap", () => ({
  useOpenGateAuthBootstrap: () => ({ ready: mocks.openGateReady, error: null }),
}))

vi.mock("@/app/lib/test-mode", () => ({
  shouldUseOpenGateSession: () => mocks.openGate,
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
}))

vi.mock("@/app/lib/avana-session/convex-session-provider", () => ({
  ConvexSessionProvider: ({ children }: { children: React.ReactNode }) =>
    mocks.convexAuthenticated ? (
      <div data-testid="convex-session">{children}</div>
    ) : (
      <div aria-label="Authenticating wallet session" />
    ),
}))

describe("AvanaSessionProviders", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    mocks.convexAuthenticated = false
    mocks.siwe.isSignedIn = true
    mocks.openGate = false
    mocks.openGateReady = true
  })

  it("does not mount wallet queries before Convex confirms the SIWE token", async () => {
    render(
      <AvanaSessionProviders>
        <div>App content</div>
      </AvanaSessionProviders>,
    )

    expect(await screen.findByLabelText("Authenticating wallet session")).toBeInTheDocument()
    expect(screen.queryByTestId("convex-session")).not.toBeInTheDocument()
  })

  it("mounts the wallet session after Convex confirms authentication", async () => {
    mocks.convexAuthenticated = true

    render(
      <AvanaSessionProviders>
        <div>App content</div>
      </AvanaSessionProviders>,
    )

    expect(await screen.findByTestId("convex-session")).toHaveTextContent("App content")
  })

  it("open-gate waits for bootstrap then mounts the authenticated Convex wallet session", async () => {
    mocks.openGate = true
    mocks.siwe.isSignedIn = false
    mocks.openGateReady = true
    mocks.convexAuthenticated = true

    render(
      <AvanaSessionProviders>
        <div>App content</div>
      </AvanaSessionProviders>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("convex-session")).toHaveTextContent("App content")
    })
    expect(screen.queryByTestId("local-session")).not.toBeInTheDocument()
  })

  it("open-gate holds the wallet session until the bootstrap JWT is ready", async () => {
    mocks.openGate = true
    mocks.openGateReady = false
    mocks.siwe.isSignedIn = false

    render(
      <AvanaSessionProviders>
        <div>App content</div>
      </AvanaSessionProviders>,
    )

    // Bootstrap not ready → nothing mounts. The top page-loading bar (rendered
    // outside this component tree) carries the loading signal; no ad-hoc
    // placeholder inside the session tree.
    expect(screen.queryByTestId("convex-session")).not.toBeInTheDocument()
    expect(screen.queryByTestId("local-session")).not.toBeInTheDocument()
    expect(screen.queryByText("App content")).not.toBeInTheDocument()
  })
})
