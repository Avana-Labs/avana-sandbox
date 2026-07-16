import { describe, expect, it } from "vitest"
import {
  borrowResultToRecordArgs,
  lendResultToRecordArgs,
  multiplyResultToRecordArgs,
} from "@/app/lib/sandbox-tx/persistence"
import type { MultiplySandboxActionResult } from "@/app/lib/multiply-system/contracts"
import type { SandboxActionResult } from "@/app/lib/borrow-system/contracts"
import type { LendSandboxActionResult } from "@/app/lib/lend-system/contracts"

const WALLET = "0xabc0000000000000000000000000000000000001"

describe("lendResultToRecordArgs", () => {
  it("persists token interest as USD together with the active supply APY", () => {
    const result = {
      historyItem: {
        intentId: "intent-lend-1",
        marketId: "weth",
        positionId: "lend-1",
        kind: "deposit",
        amount: 1,
        simulated: true,
      },
      state: {
        markets: { weth: { assetPriceUsd: 2_000, totalApy: 0.05 } },
        positions: {
          "lend-1": {
            status: "active",
            marketId: "weth",
            suppliedValueUsd: 10_000,
            interestEarned: 0.5,
          },
        },
      },
    } as unknown as LendSandboxActionResult

    const args = lendResultToRecordArgs(result, WALLET)
    expect(args.amountUsd).toBe(2_000)
    expect(args.position?.earnedUsd6).toBe("1000000000")
    expect(args.position?.supplyApyPct).toBe(5)
  })
})

/**
 * Build the minimal shape multiplyResultToRecordArgs actually reads: the history item and
 * the post-action positions map. A close deletes the position from state, so it is absent.
 */
function closeResult(overrides: { positions?: Record<string, unknown> } = {}): MultiplySandboxActionResult {
  return {
    historyItem: {
      id: "r1",
      intentId: "intent-close-1",
      walletId: WALLET,
      marketId: "eth-usdc-loop",
      positionId: "pos-1",
      kind: "close",
      status: "success",
      amountUsd: 1000,
      multiplierBefore: 2.2,
      multiplierAfter: 1,
      simulated: true,
      timestamp: 1,
      hash: "0xsimclose",
    },
    // Position was deleted by applyMultiplyAction('close').
    state: { positions: overrides.positions ?? {} },
  } as unknown as MultiplySandboxActionResult
}

function claimResult(rewardPositions: Array<{ id: string; claimableUsd6: bigint }>): SandboxActionResult {
  return {
    historyItem: {
      id: "rc1",
      intentId: "intent-claim-1",
      walletId: WALLET,
      marketId: undefined,
      assetId: undefined,
      kind: "claim",
      status: "success",
      requestedAmountUsd6: 0n,
      executedAmountUsd6: 0n,
      simulated: true,
      timestamp: 1,
      hash: "0xsimclaim",
    },
    state: {
      accounts: {
        [WALLET]: {
          rewardPositions: rewardPositions.map((position) => ({
            id: position.id,
            marketId: "m",
            claimableUsd6: position.claimableUsd6,
            earnedUsd6: position.claimableUsd6,
          })),
        },
      },
    },
  } as unknown as SandboxActionResult
}

describe("borrowResultToRecordArgs — claim persistence", () => {
  it("emits the post-claim remaining claimable per reward position", () => {
    const args = borrowResultToRecordArgs(
      claimResult([
        { id: "claim-eth-usdc", claimableUsd6: 0n }, // fully claimed
        { id: "claim-wbtc-weth", claimableUsd6: 50_000000n }, // partially claimed → $50 left
      ]),
      WALLET,
    )
    expect(args.kind).toBe("claim")
    expect(args.rewardClaims).toEqual([
      { rewardPositionId: "claim-eth-usdc", remainingUsd6: "0" },
      { rewardPositionId: "claim-wbtc-weth", remainingUsd6: "50000000" },
    ])
  })

  it("omits rewardClaims when the wallet has no reward positions", () => {
    const args = borrowResultToRecordArgs(claimResult([]), WALLET)
    expect(args.kind).toBe("claim")
    expect(args.rewardClaims).toBeUndefined()
  })
})

describe("multiplyResultToRecordArgs — close persistence (regression: C-1)", () => {
  it("emits an explicit closed position payload when a successful close deleted the position", () => {
    const args = multiplyResultToRecordArgs(closeResult(), WALLET)
    expect(args.kind).toBe("close")
    expect(args.marketSlug).toBe("eth-usdc-loop")
    // The whole point: without a position payload recordTransaction skips the close and the
    // server row resurrects as "open". It must be present and closed.
    expect(args.position).toBeDefined()
    expect(args.position?.status).toBe("closed")
    expect(args.position?.debtValueUsd).toBe(0)
    expect(args.position?.collateralValueUsd).toBe(0)
    expect(args.position?.multiplier).toBe(1)
    expect(args.position?.ltv).toBe(0)
  })

  it("does not synthesize a closed payload for a failed close (position untouched)", () => {
    const failed = closeResult({ positions: {} })
    failed.historyItem.status = "failed"
    const args = multiplyResultToRecordArgs(failed, WALLET)
    expect(args.position).toBeUndefined()
  })

  it("persists a fully-deleveraged 1x position as OPEN, matching local state (regression: M-6)", () => {
    // The engine keeps a 1x/$0 position after a full deleverage; persisting it as "closed"
    // (the old multiplier<=1 heuristic) made the dashboard and server disagree.
    const result = {
      historyItem: {
        id: "r2",
        intentId: "intent-deleverage-1",
        walletId: WALLET,
        marketId: "eth-usdc-loop",
        positionId: "pos-1",
        kind: "deleverage",
        status: "success",
        amountUsd: 500,
        multiplierBefore: 2.2,
        multiplierAfter: 1,
        simulated: true,
        timestamp: 1,
        hash: "0xsimdelever",
      },
      state: {
        positions: {
          "pos-1": {
            id: "pos-1",
            walletId: WALLET,
            marketId: "eth-usdc-loop",
            collateralAmount: 1,
            collateralValueUsd: 1000,
            debtValueUsd: 0,
            multiplier: 1,
            ltv: 0,
            healthFactor: "infinity",
            liquidationPrice: null,
            netApy: 3,
          },
        },
      },
    } as unknown as MultiplySandboxActionResult

    const args = multiplyResultToRecordArgs(result, WALLET)
    expect(args.position).toBeDefined()
    expect(args.position?.status).toBe("open")
    expect(args.position?.multiplier).toBe(1)
    // Per-transaction leverage is carried through so hydrated history shows 2.2x → 1x (M-7).
    expect(args.multiplierBefore).toBe(2.2)
    expect(args.multiplierAfter).toBe(1)
  })
})
