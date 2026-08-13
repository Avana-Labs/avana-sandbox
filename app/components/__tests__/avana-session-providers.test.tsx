import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AvanaSessionProviders } from "../avana-session-providers"

const mocks = vi.hoisted(() => ({
  convexAuthenticated: false,
  openGate: false,
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
  // Module-level `new ConvexReactClient(...)` at the top of avana-session-providers.tsx
  // needs a constructor even when the tests never render the open-gate provider — the
  // real client would try to touch localStorage on import. Stub it here.
  ConvexReactClient: class {
    constructor() {}
  },
  ConvexProviderWithAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/app/lib/siwe/use-siwe-auth", () => ({
  useSiweAuth: () => mocks.siwe,
  // Convex provider mounts this hook even in open-gate mode; return a stable stub so
  // the ConvexProviderWithAuth callable-auth signature is satisfied without a token.
  useConvexSiweAuth: () => ({ isLoading: false, isAuthenticated: false, fetchAccessToken: async () => null }),
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

vi.mock("@/app/lib/avana-session/convex-market-snapshot-hydrators", () => ({
  ConvexMarketSnapshotHydrators: () => <div data-testid="open-gate-market-hydrate" />,
}))

describe("AvanaSessionProviders", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    mocks.convexAuthenticated = false
    mocks.siwe.isSignedIn = true
    mocks.openGate = false
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

  it("open-gate hydrates public market snapshots without authed wallet session", async () => {
    mocks.openGate = true
    mocks.siwe.isSignedIn = false

    render(
      <AvanaSessionProviders>
        <div>App content</div>
      </AvanaSessionProviders>,
    )

    expect(await screen.findByTestId("local-session")).toHaveTextContent("App content")
    expect(screen.getByTestId("open-gate-market-hydrate")).toBeInTheDocument()
    expect(screen.queryByLabelText("Authenticating wallet session")).not.toBeInTheDocument()
  })
})
