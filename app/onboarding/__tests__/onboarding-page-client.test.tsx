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
  it("shows the completed state (not the claim flow) when onboardingStep is 'done'", () => {
    walletStateMock.mockReturnValue(walletState("done"))
    render(<OnboardingPageClient />)

    expect(screen.getByText(/You're all set\./i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Open dashboard/i })).toHaveAttribute("href", "/dashboard")
    // No re-claim affordance is offered to an already-onboarded user.
    expect(screen.queryByRole("button", { name: /Claim your allocation/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Fund my sandbox/i)).not.toBeInTheDocument()
  })

  it("still renders the claim flow for a wallet that has NOT onboarded", () => {
    walletStateMock.mockReturnValue(walletState("wallet"))
    render(<OnboardingPageClient />)

    expect(screen.getByText(/Fund my sandbox/i)).toBeInTheDocument()
    expect(screen.queryByText(/You've already claimed/i)).not.toBeInTheDocument()
  })
})
