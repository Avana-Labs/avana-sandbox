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

  async function seedPrice(t: ReturnType<typeof convexTest>, symbol: string, priceUsd: number) {
    await t.run(async (ctx) => {
      await ctx.db.insert("tokenPrices", {
        symbol,
        llamaId: `test:${symbol}`,
        priceUsd,
        source: "baseline",
        updatedAt: 0,
      })
    })
  }

  test("authoritative: recomputes the output from the oracle, ignoring a forged high output", async () => {
    const t = convexTest(schema, modules)
    await seedPrice(t, "eth", 2000)
    await seedPrice(t, "wbtc", 65000)
    const asUser = t.withIdentity({ subject: WALLET })
    // Client forges 1000 WBTC (~$65M) out of a 0.5 ETH input. With both legs priced the server
    // COMPUTES the output (no mint possible): 0.5 ETH=$1000 → 1000/65000 gross, −0.30% fee −0.35% impact.
    const res = await asUser.mutation(
      api.sandbox.transactions.recordSwap,
      swapIntent("mint1", { outputAssetId: "wbtc", outputSymbol: "WBTC", outputAmount: 1000, amountUsd: 967 }),
    )
    expect(res.receipt.status).toBe("success")
    const rows = await asUser.query(api.sandbox.transactions.getWalletSwapTransactions, { wallet: WALLET })
    expect(rows[0].outputAmount).toBeCloseTo(0.0152846, 5) // server value, NOT the forged 1000
    expect(rows[0].outputAmount).toBeLessThan(1)
    expect(rows[0].amountUsd).toBeCloseTo(1000, 6) // 0.5 ETH × $2000, not the client's $967
  })

  test("authoritative: recomputes amountUsd from the oracle, ignoring a forged high USD", async () => {
    const t = convexTest(schema, modules)
    await seedPrice(t, "usdc", 1)
    await seedPrice(t, "eth", 2000)
    const asUser = t.withIdentity({ subject: WALLET })
    // Client claims $65M moved from a single USDC input; server recomputes amountUsd = 1×$1 = $1.
    const res = await asUser.mutation(
      api.sandbox.transactions.recordSwap,
      swapIntent("mint2", {
        inputAssetId: "usdc",
        inputSymbol: "USDC",
        inputAmount: 1,
        outputAssetId: "eth",
        outputSymbol: "ETH",
        outputAmount: 1,
        amountUsd: 65_000_000,
      }),
    )
    expect(res.receipt.status).toBe("success")
    const rows = await asUser.query(api.sandbox.transactions.getWalletSwapTransactions, { wallet: WALLET })
    expect(rows[0].amountUsd).toBeCloseTo(1, 6) // server value, NOT the forged $65M
  })

  test("unpriced-fallback mint guard: still rejects a forged USD above the priced input leg", async () => {
    const t = convexTest(schema, modules)
    // Only the INPUT leg (eth) is priced; the output (wbtc) is unpriced → fail-open path, where
    // the oracle anti-mint bound on the priced input leg still applies.
    await seedPrice(t, "eth", 2000)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(
        api.sandbox.transactions.recordSwap,
        swapIntent("mint3", {
          outputAssetId: "wbtc",
          outputSymbol: "WBTC",
          outputAmount: 1000,
          amountUsd: 65_000_000, // far above 0.5 ETH × $2000
        }),
      ),
    ).rejects.toThrow(/INVALID_SWAP/)
  })

  test("mint guard: allows a swap consistent with the oracle rate", async () => {
    const t = convexTest(schema, modules)
    await seedPrice(t, "eth", 2000)
    await seedPrice(t, "usdc", 1)
    const asUser = t.withIdentity({ subject: WALLET })
    // 0.5 ETH (~$1000) -> ~967 USDC for a claimed $967: within tolerance, must record.
    const res = await asUser.mutation(
      api.sandbox.transactions.recordSwap,
      swapIntent("ok1", { amountUsd: 967, outputAmount: 967 }),
    )
    expect(res.idempotent).toBe(false)
    expect(res.receipt.status).toBe("success")
  })
})
