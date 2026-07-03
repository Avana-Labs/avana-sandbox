import { describe, expect, it } from "vitest"
import { multiplyResultToRecordArgs } from "@/app/lib/sandbox-tx/persistence"
import type { MultiplySandboxActionResult } from "@/app/lib/multiply-system/contracts"

const WALLET = "0xabc0000000000000000000000000000000000001"

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
})
