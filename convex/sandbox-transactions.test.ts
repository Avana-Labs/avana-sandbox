// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"
import { MAX_TX_PER_HOUR } from "./sandbox/transactions"

// Rooted at the convex directory so convex-test can resolve "sandbox/*".
const modules = import.meta.glob("./**/*.*s")

const WALLET = "0xAbC0000000000000000000000000000000000001"
const OTHER = "0xDdD0000000000000000000000000000000000002"

function borrowIntent(intentId: string, overrides: Record<string, unknown> = {}) {
  return {
    wallet: WALLET,
    intentId,
    product: "borrow" as const,
    kind: "borrow",
    marketSlug: "uni-v3-bluechip-weth-usdc",
    assetId: "uni-v2:usdc",
    requestedAmountUsd6: "1000000000",
    executedAmountUsd6: "1000000000",
    amountUsd: 1000,
    simulated: true,
    ...overrides,
  }
}

describe("recordTransaction — ownership, idempotency, rate limit, ledger", () => {
  test("rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules)
    await expect(t.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("i1"))).rejects.toThrow(
      /UNAUTHENTICATED/,
    )
  })

  test("rejects a wallet that does not match the authed identity", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("i1", { wallet: OTHER })),
    ).rejects.toThrow(/WALLET_MISMATCH/)
  })

  test("writes exactly one transaction row + a position, and the ledger delta", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    const res = await asUser.mutation(
      api.sandbox.transactions.recordTransaction,
      borrowIntent("i1", {
        position: { status: "open", marketSlug: "uni-v3-bluechip-weth-usdc", debtValueUsd6: "1000000000" },
        ledger: { marketSlug: "uni-v2:usdc", borrowedDeltaUsd: 1000 },
      }),
    )
    expect(res.idempotent).toBe(false)
    expect(res.receipt.status).toBe("success")
    expect(res.receipt.hash).toMatch(/^sim-borrow-borrow-/)

    const activity = await asUser.query(api.sandbox.transactions.getActivity, { wallet: WALLET })
    expect(activity).toHaveLength(1)
    expect(activity[0]?.kind).toBe("borrow")

    const positions = await asUser.query(api.sandbox.transactions.getPositions, { wallet: WALLET })
    expect(positions).toHaveLength(1)
    expect(positions[0]?.product).toBe("borrow")
    expect(positions[0]?.debtValueUsd6).toBe("1000000000")

    const ledger = await t.query(api.liquidity.listDeltas)
    const row = ledger.find((r) => r.marketSlug === "uni-v2:usdc")
    expect(row?.borrowedDeltaUsd).toBe(1000)
  })

  test("idempotent on intentId — a replay returns the existing row and does not double-apply", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    const first = await asUser.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("dup"))
    const second = await asUser.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("dup"))
    expect(second.idempotent).toBe(true)
    expect(second.transactionId).toBe(first.transactionId)

    const activity = await asUser.query(api.sandbox.transactions.getActivity, { wallet: WALLET })
    expect(activity).toHaveLength(1)
  })

  test("enforces the hourly per-wallet rate limit", async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    await t.run(async (ctx) => {
      for (let i = 0; i < MAX_TX_PER_HOUR; i++) {
        await ctx.db.insert("transactions", {
          wallet: WALLET.toLowerCase(),
          intentId: `seed-${i}`,
          product: "borrow",
          kind: "borrow",
          status: "success",
          requestedAmountUsd6: "1",
          executedAmountUsd6: "1",
          amountUsd: 1,
          syntheticTxHash: `seed-${i}`,
          simulated: true,
          at: now - 1000,
        })
      }
    })
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(asUser.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("over"))).rejects.toThrow(
      /RATE_LIMITED/,
    )
  })
})

describe("liquidation recording", () => {
  test("records a liquidation gated on the liquidator (acting on a victim it does not own)", async () => {
    const t = convexTest(schema, modules)
    const asLiquidator = t.withIdentity({ subject: OTHER })
    const res = await asLiquidator.mutation(api.sandbox.liquidation.recordLiquidation, {
      wallet: WALLET, // victim
      liquidatorWallet: OTHER,
      repaidUsd6: "500000000",
      seizedCollateralUsd6: "550000000",
      healthFactorWadBefore: "900000000000000000",
      healthFactorWadAfter: "1100000000000000000",
    })
    expect(res.hash).toMatch(/^sim-liquidate-/)

    // The liquidator sees it as an outgoing liquidation.
    const liq = await asLiquidator.query(api.sandbox.liquidation.getLiquidations, { wallet: OTHER })
    expect(liq.asLiquidator).toHaveLength(1)
    expect(liq.asLiquidator[0]?.wallet).toBe(WALLET.toLowerCase())

    // The victim sees it as an incoming liquidation.
    const asVictim = t.withIdentity({ subject: WALLET })
    const victimView = await asVictim.query(api.sandbox.liquidation.getLiquidations, { wallet: WALLET })
    expect(victimView.asVictim).toHaveLength(1)
  })

  test("rejects a liquidation whose liquidatorWallet is not the caller", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(api.sandbox.liquidation.recordLiquidation, {
        wallet: OTHER,
        liquidatorWallet: OTHER, // caller is WALLET, not OTHER
        repaidUsd6: "1",
        seizedCollateralUsd6: "1",
        healthFactorWadBefore: null,
        healthFactorWadAfter: null,
      }),
    ).rejects.toThrow(/LIQUIDATOR_MISMATCH/)
  })
})
