import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LendActionBox } from "@/app/lend/components/lend-action-box"
import { DeleverageModal } from "@/app/multiply/components/deleverage-modal"
import { MultiplyActionBox } from "@/app/multiply/components/multiply-action-box"

let currentLendActionBox: unknown
let currentMultiplyActionBox: unknown

vi.mock("@/app/lib/lend-system/lend-session-context", () => ({
  useLendSessionContext: () => ({
    walletId: "wallet-1",
    state: { positions: {} },
  }),
}))

vi.mock("@/app/lib/lend-system/use-lend-action-box", () => ({
  useLendActionBox: () => currentLendActionBox,
}))

vi.mock("@/app/lib/multiply-system/multiply-session-context", () => ({
  useMultiplySessionContext: () => ({
    walletId: "wallet-1",
  }),
}))

vi.mock("@/app/lib/multiply-system/use-multiply-action-box", () => ({
  useMultiplyActionBox: () => currentMultiplyActionBox,
}))

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h2 className={className}>{children}</h2>,
}))

function createLendPreview() {
  return {
    intent: {
      id: "intent-1",
      actionType: "deposit" as const,
      walletId: "wallet-1",
      marketId: "gho",
      requestedAt: Date.now(),
      simulated: true,
    },
    allowed: true,
    warnings: [],
    validationErrors: [],
    before: {
      suppliedAmount: 0,
      suppliedValueUsd: 0,
      principalAmount: 0,
      interestEarned: 0,
      currentApy: 0.0299,
    },
    after: {
      suppliedAmount: 500,
      suppliedValueUsd: 500,
      principalAmount: 500,
      interestEarned: 0,
      currentApy: 0.0299,
    },
  }
}

function createMultiplyPreview() {
  return {
    allowed: true,
    warnings: [],
    validationErrors: [],
    before: {
      collateralValueUsd: 1000,
      debtValueUsd: 500,
      ltv: 0.5,
      healthFactor: 2.5,
      netApy: 0.08,
      multiplier: 2,
    },
    after: {
      collateralValueUsd: 1500,
      debtValueUsd: 750,
      ltv: 0.5,
      healthFactor: 2.4,
      netApy: 0.09,
      multiplier: 2.5,
    },
    simulationSummary: {
      liquidationPrice: 1200,
      priceImpactPct: 0.01,
    },
  }
}

describe("sandbox action success CTAs", () => {
  beforeEach(() => {
    currentLendActionBox = {
      stage: "success",
      preview: createLendPreview(),
      canAdvance: false,
      reset: vi.fn(),
      advance: vi.fn(),
      prepareAction: vi.fn(),
      refreshPreview: vi.fn(),
    }
    currentMultiplyActionBox = {
      stage: "success",
      preview: createMultiplyPreview(),
      canAdvance: false,
      reset: vi.fn(),
      advance: vi.fn(),
      prepareAction: vi.fn(),
      refreshPreview: vi.fn(),
    }
  })

  it("keeps the lend success Done button enabled after execution completes", () => {
    render(
      <LendActionBox
        market={
          {
            marketId: "gho",
            asset: { symbol: "GHO" },
            supplyApy: 0.0299,
            rewardsApy: 0,
            totalApy: 0.0299,
            utilization: 0.6411,
          } as never
        }
      />,
    )

    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled()
  })

  it("keeps the multiply success Done button enabled after execution completes", () => {
    render(
      <MultiplyActionBox
        market={
          {
            id: "eth-usdt",
            collateralAsset: { symbol: "ETH" },
            borrowAsset: { symbol: "USDT" },
            economics: { supplyApy: 0.04, borrowApy: 0.02 },
            risk: {
              recommendedMaxMultiplier: 2,
              publicMaxMultiplier: 3,
              maxLtv: 0.75,
              collateralFactor: 0.7,
              liquidationThreshold: 0.8,
            },
          } as never
        }
      />,
    )

    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled()
  })

  it("keeps the deleverage success Done button enabled after execution completes", () => {
    render(
      <DeleverageModal
        open
        onOpenChange={vi.fn()}
        market={
          {
            collateralAsset: { symbol: "ETH" },
          } as never
        }
        position={
          {
            id: "position-1",
            multiplier: 2,
            liquidationPrice: 1000,
          } as never
        }
        session={
          {
            walletId: "wallet-1",
          } as never
        }
      />,
    )

    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled()
  })
})
