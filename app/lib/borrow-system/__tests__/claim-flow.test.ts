import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { parseFixed } from "@/app/lib/credit-engine"
import { EXAMPLE_WALLET_1_REWARD_ID } from "@/app/lib/credit-engine/__tests__/fixtures"
import {
  buildClaimBorrowAction,
  buildHomeClaimPreview,
} from "@/app/lib/borrow-system/home-runtime"
import {
  isClaimSupportedByTransactionAdapter,
} from "@/app/lib/borrow-system/claim-adapter-policy"
import {
  HOME_CLAIM_POSITIONS,
  HOME_INITIAL_CLAIM_SELECTIONS,
} from "@/app/lib/home-sim"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { createBorrowFlowHarness, runBorrowActionBoxFlow } from "./flow.harness"

describe("claim adapter policy", () => {
  it("routes claim through the canonical transaction adapter path", () => {
    expect(isClaimSupportedByTransactionAdapter()).toBe(true)
  })
})

describe("home claim preview runtime", () => {
  it("builds claim preview from engine reward positions", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const preview = buildHomeClaimPreview(
      state,
      "demo-wallet",
      HOME_CLAIM_POSITIONS,
      HOME_INITIAL_CLAIM_SELECTIONS,
      null,
    )

    expect(preview.hasSelection).toBe(true)
    expect(preview.selectedPositionIds).toEqual(["claim-eth-usdc", "claim-usdc-usdt"])
    expect(preview.effectiveClaimUsd).toBe(142 + 62.4)
    expect(preview.tokenTotals.ETH).toBeGreaterThan(0)
  })

  it("caps partial claim amounts at the selected position total", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const preview = buildHomeClaimPreview(
      state,
      "demo-wallet",
      HOME_CLAIM_POSITIONS,
      { "claim-eth-usdc": true, "claim-usdc-usdt": false, "claim-wbtc-eth": false },
      200,
    )

    expect(preview.effectiveClaimUsd).toBe(142)
    expect(preview.hasCustomAmount).toBe(true)
  })

  it("builds a canonical claim BorrowAction from preview state", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const preview = buildHomeClaimPreview(
      state,
      "demo-wallet",
      HOME_CLAIM_POSITIONS,
      { "claim-eth-usdc": true, "claim-usdc-usdt": false, "claim-wbtc-eth": false },
      null,
    )
    const action = buildClaimBorrowAction("demo-wallet", preview)

    expect(action).toEqual({
      type: "claim",
      walletId: "demo-wallet",
      rewardPositionIds: ["claim-eth-usdc"],
      amountUsd6: parseFixed("142", 6),
    })
  })
})

describe("claim action box flow", () => {
  it("executes claim through adapter-backed action box contract", async () => {
    const harness = createBorrowFlowHarness()
    const beforeBalance = harness.getState().accounts["wallet-1"]!.walletBalanceUsd6

    const { result, executeResult } = await runBorrowActionBoxFlow(harness, {
      type: "claim",
      walletId: "wallet-1",
      rewardPositionIds: [EXAMPLE_WALLET_1_REWARD_ID],
      amountUsd6: parseFixed("75", 6),
    })

    expect(result.current.successUi?.receipt.status).toBe("success")
    expect(executeResult?.historyItem.kind).toBe("claim")
    expect(harness.getState().accounts["wallet-1"]!.walletBalanceUsd6).toBe(beforeBalance + parseFixed("75", 6))
  })
})

describe("claim flow surfaces", () => {
  const claimSurfaces = ["app/components/home-page-client.tsx", "app/borrow/_detail/sidebars/PoolBorrowSidebar.tsx"]

  it("routes claim UI through buildHomeClaimPreview instead of direct home-sim math", () => {
    const offenders = claimSurfaces.filter((file) => {
      const source = readFileSync(path.join(process.cwd(), file), "utf8")
      return source.includes("calculateClaimPreview(")
    })

    expect(offenders).toEqual([])
  })

  it("labels pool-detail claim transaction flow as simulated", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/borrow/_detail/sidebars/PoolBorrowSidebar.tsx"),
      "utf8",
    )
    expect(source).toContain("buildClaimBorrowAction")
    expect(source).toMatch(/TransactionFlowPanel[\s\S]*simulated/)
  })
})
