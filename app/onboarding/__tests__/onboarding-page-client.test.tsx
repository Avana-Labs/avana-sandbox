import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OnboardingGateState } from "@/app/components/sandbox/onboarding-flow"

// A Convex client "exists" so the page renders the connected flow rather than the
// "requires a Convex connection" placeholder.
vi.mock("@/app/lib/convex/market-liquidity-provider", () => ({ hasConvexClient: true }))

// Route each useQuery(...) call by the mocked query identity so the split
// getWalletOnboardingState / getEconomyStatus subscriptions each get their own value.
const walletStateMock = vi.fn()
const economyMock = vi.fn()
const noopMutation = vi.fn().mockResolvedValue(undefined)
vi.mock("convex/react", () => ({
  useQuery: (query: { name?: string } | undefined, args: unknown) => {
    if (args === "skip") return undefined
    if (query?.name === "getEconomyStatus") return economyMock()
    return walletStateMock()
  },
  useMutation: () => noopMutation,
}))

vi.mock("@/convex/_generated/api", () => ({
  api: {
    sandbox: {
      onboarding: {
        getState: { name: "getState" },
        getWalletOnboardingState: { name: "getWalletOnboardingState" },
        getEconomyStatus: { name: "getEconomyStatus" },
        beginAnalysis: {},
        startAnalysis: {},
        startTweet: {},
        confirmTweet: {},
        skipTweet: {},
        beginClaim: {},
        claim: {},
      },
    },
  },
}))

const useSiweAuthMock = vi.fn()
vi.mock("@/app/lib/siwe/use-siwe-auth", () => ({ useSiweAuth: () => useSiweAuthMock() }))

const routerReplaceMock = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: routerReplaceMock, push: vi.fn() }) }))

// onboarding-flow pulls in connectkit via wallet-control; stub it for jsdom.
vi.mock("@/app/components/wallet-control", () => ({ WalletControl: () => <div data-testid="wallet-control" /> }))
vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (s: string) => s, language: "en" }),
}))

import { OnboardingPageClient } from "../onboarding-page-client"

const WALLET = "0xabc0000000000000000000000000000000000001"

function walletState(step: OnboardingGateState["onboardingStep"]): Omit<OnboardingGateState, "economy"> {
  return {
    onboardingStep: step,
    profile: { eligibilityTier: 1 },
    config: { basket: [], tweetTemplate: "", xHandle: "", resourcesLinks: [] },
  }
}

const ECONOMY: OnboardingGateState["economy"] = { status: "open", userCount: 1, userCap: 10, perUserTargetUsd: 1_000_000 }

beforeEach(() => {
  useSiweAuthMock.mockReturnValue({ authedWallet: WALLET, isSignedIn: true })
  economyMock.mockReturnValue(ECONOMY)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("OnboardingPageClient — already-onboarded wallet (issue #140)", () => {
  it("redirects an already-onboarded wallet into the app (never re-shows onboarding)", () => {
    walletStateMock.mockReturnValue(walletState("done"))
    render(<OnboardingPageClient />)

    // A completed wallet is sent straight to the dashboard, not shown any onboarding UI.
    expect(routerReplaceMock).toHaveBeenCalledWith("/dashboard")
    expect(screen.queryByRole("button", { name: /Claim your allocation/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Fund my sandbox/i)).not.toBeInTheDocument()
  })

  it("still renders the active onboarding flow for a wallet that has NOT onboarded", () => {
    walletStateMock.mockReturnValue(walletState("wallet"))
    render(<OnboardingPageClient />)

    // A fresh wallet now lands on the personalize step first (name/language/currency/theme),
    // ahead of the funding card — not the already-onboarded "completed" state.
    expect(screen.getByText(/Now let's make Avana yours/i)).toBeInTheDocument()
    expect(routerReplaceMock).not.toHaveBeenCalled()
  })
})
