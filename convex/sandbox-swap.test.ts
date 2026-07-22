// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"

const modules = import.meta.glob("./**/*.*s")

const WALLET = "0xAbC0000000000000000000000000000000000001"
const OTHER = "0xDdD0000000000000000000000000000000000002"

function swapIntent(intentId: string, overrides: Record<string, unknown> = {}) {
  return {
    wallet: WALLET,
    intentId,
    inputAssetId: "eth",
    outputAssetId: "usdc",
    inputSymbol: "ETH",
    outputSymbol: "USDC",
    inputAmount: 0.5,
    outputAmount: 967,
    amountUsd: 967,
    simulated: true,
    ...overrides,
  }
}

describe("recordSwap — durable swap persistence (#15)", () => {
  test("rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules)
    await expect(t.mutation(api.sandbox.transactions.recordSwap, swapIntent("s1"))).rejects.toThrow(/UNAUTHENTICATED/)
  })

  test("rejects a wallet that does not match the authed identity", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(api.sandbox.transactions.recordSwap, swapIntent("s1", { wallet: OTHER })),
    ).rejects.toThrow(/WALLET_MISMATCH/)
  })

  test("records exactly one swap transaction with the token legs", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    const res = await asUser.mutation(api.sandbox.transactions.recordSwap, swapIntent("s1"))
    expect(res.idempotent).toBe(false)
    expect(res.receipt.status).toBe("success")

    const rows = await asUser.query(api.sandbox.transactions.getWalletSwapTransactions, { wallet: WALLET })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      status: "success",
      inputSymbol: "ETH",
      outputSymbol: "USDC",
      inputAmount: 0.5,
      outputAmount: 967,
      amountUsd: 967,
    })
  })

  test("is idempotent on a replayed intent (no double record)", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    const first = await asUser.mutation(api.sandbox.transactions.recordSwap, swapIntent("s1"))
    const replay = await asUser.mutation(api.sandbox.transactions.recordSwap, swapIntent("s1"))
    expect(replay.idempotent).toBe(true)
    expect(replay.transactionId).toBe(first.transactionId)
    const rows = await asUser.query(api.sandbox.transactions.getWalletSwapTransactions, { wallet: WALLET })
    expect(rows).toHaveLength(1)
  })

  test("a failed swap persists with a zero output leg (nothing moved)", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    // The real failed path (recordFailure) carries a positive input but a 0 output. This must
    // persist — the durable history explicitly supports failed rows — not be rejected.
    await asUser.mutation(api.sandbox.transactions.recordSwap, swapIntent("s1", { status: "failed", outputAmount: 0 }))
    const rows = await asUser.query(api.sandbox.transactions.getWalletSwapTransactions, { wallet: WALLET })
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe("failed")
    expect(rows[0].outputAmount).toBe(0)
    expect(rows[0].amountUsd).toBe(0)
  })

  test("rejects a non-positive input amount", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(api.sandbox.transactions.recordSwap, swapIntent("s1", { inputAmount: 0 })),
    ).rejects.toThrow(/INVALID_SWAP/)
  })

  test("rejects a successful swap with a zero output amount", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(api.sandbox.transactions.recordSwap, swapIntent("s1", { status: "success", outputAmount: 0 })),
    ).rejects.toThrow(/INVALID_SWAP/)
  })
})
