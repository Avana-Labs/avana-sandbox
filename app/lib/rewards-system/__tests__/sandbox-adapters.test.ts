import { describe, expect, it } from "vitest"
import {
  buildDefaultRewardsSessionState,
  SandboxRewardsActionAdapter,
  SandboxRewardsReadAdapter,
} from "@/app/lib/rewards-system"
import { buildBorrowSessionSeed } from "@/app/lib/borrow-system/demo-session"
import { deserializeBorrowSystemState } from "@/app/lib/borrow-system/codec"
import { buildLendSessionSeed } from "@/app/lib/lend-system/demo-session"
import { deserializeLendSystemState } from "@/app/lib/lend-system/codec"
import { buildMultiplySessionSeed } from "@/app/lib/multiply-system/demo-session"
import { deserializeMultiplySystemState } from "@/app/lib/multiply-system/codec"

describe("sandbox rewards adapters", () => {
  it("records activity and claims rewards without mutating borrow, lend, or multiply state", async () => {
    const wallet = "demo-wallet"
    const borrowBefore = deserializeBorrowSystemState(buildBorrowSessionSeed(wallet))
    const lendBefore = deserializeLendSystemState(buildLendSessionSeed(wallet))
    const multiplyBefore = deserializeMultiplySystemState(buildMultiplySessionSeed(wallet))

    let state = buildDefaultRewardsSessionState()
    const actionAdapter = new SandboxRewardsActionAdapter({
      readState: () => state,
      writeState: (nextState) => {
        state = nextState
      },
      now: () => Date.UTC(2026, 5, 19),
    })
    const readAdapter = new SandboxRewardsReadAdapter({
      state: () => state,
      now: () => Date.UTC(2026, 5, 19),
    })

    await actionAdapter.initializeRewardsForWallet(wallet)
    await actionAdapter.recordActivityEvent({
      id: "lend-1",
      wallet,
      product: "lend",
      type: "lend_deposited",
      amountUsd: 6_000,
      timestamp: Date.UTC(2026, 5, 19),
    })

    const progress = await actionAdapter.refreshTaskProgress(wallet)
    expect(progress.find((item) => item.taskId === "first-lend-deposit")?.status).toBe("claimable")

    await actionAdapter.claimReward(wallet, "first-lend-deposit")

    const summary = await readAdapter.readRewardSummary(wallet)
    expect(summary.totalClaimedAmount).toBe(40)

    expect(deserializeBorrowSystemState(buildBorrowSessionSeed(wallet))).toEqual(borrowBefore)
    expect(deserializeLendSystemState(buildLendSessionSeed(wallet))).toEqual(lendBefore)
    expect(deserializeMultiplySystemState(buildMultiplySessionSeed(wallet))).toEqual(multiplyBefore)
  })
})
