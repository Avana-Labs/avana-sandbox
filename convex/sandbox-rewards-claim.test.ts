// @vitest-environment edge-runtime
//
// Wave-4 F guardrail: `recordRewardsClaim` is server-authoritative. The mutation
// derives the payout from the on-server quest catalog and refuses to trust the
// client's `amountUsd`, so an inflated or forged claim can't be persisted. This
// suite pins down: (1) catalog-derived amount, (2) unknown-task rejection,
// (3) durable single-claim guard across intent ids.
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"

const modules = import.meta.glob("./**/*.*s")

const WALLET = "0x0000000000000000000000000000000000000abc"

describe("recordRewardsClaim — server-authoritative payout", () => {
  test("payout is derived from the on-server catalog, not the client", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })

    // connect-wallet = 25 AVA, create-profile = 20 AVA → 45 AVA at 1:1 USD.
    const result = await asUser.mutation(api.sandbox.transactions.recordRewardsClaim, {
      wallet: WALLET,
      intentId: "rewards:test:1",
      taskIds: ["connect-wallet", "create-profile"],
      syntheticTxHash: "0xdeadbeef1",
    })
    expect(result.idempotent).toBe(false)
    expect(result.amountUsd).toBe(45)

    // The persisted transaction matches the derived amount, not any client input.
    const rows = await t.run(async (ctx) => await ctx.db.query("transactions").collect())
    const rewardRow = rows.find((r) => r.intentId === "rewards:test:1")
    expect(rewardRow?.amountUsd).toBe(45)
    expect(rewardRow?.claimedTaskIds).toEqual(["connect-wallet", "create-profile"])
  })

  test("forged unknown task ids are rejected", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(api.sandbox.transactions.recordRewardsClaim, {
        wallet: WALLET,
        intentId: "rewards:test:forged",
        taskIds: ["totally-made-up-task"],
        syntheticTxHash: "0xdeadbeef2",
      }),
    ).rejects.toThrow(/UNKNOWN_TASK_ID/)

    const rows = await t.run(async (ctx) => await ctx.db.query("transactions").collect())
    expect(rows.filter((r) => r.product === "rewards")).toHaveLength(0)
  })

  test("claiming an already-paid task on a fresh intent id is rejected", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })

    await asUser.mutation(api.sandbox.transactions.recordRewardsClaim, {
      wallet: WALLET,
      intentId: "rewards:test:first",
      taskIds: ["connect-wallet"],
      syntheticTxHash: "0xhash1",
    })

    await expect(
      asUser.mutation(api.sandbox.transactions.recordRewardsClaim, {
        wallet: WALLET,
        intentId: "rewards:test:double-dip",
        taskIds: ["connect-wallet"],
        syntheticTxHash: "0xhash2",
      }),
    ).rejects.toThrow(/TASK_ALREADY_CLAIMED/)
  })

  test("empty taskIds AND no legacy amount are rejected", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(api.sandbox.transactions.recordRewardsClaim, {
        wallet: WALLET,
        intentId: "rewards:test:empty",
        taskIds: [],
        syntheticTxHash: "0xhash-empty",
      }),
    ).rejects.toThrow(/EMPTY_CLAIM/)
  })

  test("legacy amountUsd path (no taskIds) still records for a rollout-old client", async () => {
    // A still-deployed old client calls with amountUsd and no taskIds. The deploy
    // must not break it: the amount is trusted verbatim (transitional), the row is
    // written, but it carries no claimedTaskIds (so it can't be double-claim-guarded).
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    const result = await asUser.mutation(api.sandbox.transactions.recordRewardsClaim, {
      wallet: WALLET,
      intentId: "rewards:test:legacy",
      amountUsd: 12.5,
      syntheticTxHash: "0xhash-legacy",
    })
    expect(result.idempotent).toBe(false)
    expect(result.amountUsd).toBe(12.5)
    const rows = await t.run(async (ctx) => await ctx.db.query("transactions").collect())
    const row = rows.find((r) => r.intentId === "rewards:test:legacy")
    expect(row?.amountUsd).toBe(12.5)
    expect(row?.claimedTaskIds).toBeUndefined()
  })

  test("prior intent id still short-circuits idempotently", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })

    const first = await asUser.mutation(api.sandbox.transactions.recordRewardsClaim, {
      wallet: WALLET,
      intentId: "rewards:test:idem",
      taskIds: ["favorite-market"],
      syntheticTxHash: "0xhash-idem",
    })
    const second = await asUser.mutation(api.sandbox.transactions.recordRewardsClaim, {
      wallet: WALLET,
      intentId: "rewards:test:idem",
      taskIds: ["favorite-market"],
      syntheticTxHash: "0xhash-idem",
    })
    expect(second.idempotent).toBe(true)
    expect(second.transactionId).toEqual(first.transactionId)
  })
})
