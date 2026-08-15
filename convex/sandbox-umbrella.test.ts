// @vitest-environment edge-runtime
//
// Umbrella lifecycle coverage: stake / claim / startCooldown / unstake, plus
// the dev-controls surface (advanceCooldown, simulateDeficit, simulateSlash)
// and the frozen catalog fold into getSessionState.
//
// Same harness as sandbox-transactions.test.ts / sandbox-rewards.test.ts:
// convex-test wired to the generated schema, wallet-scoped identity via
// t.withIdentity, and direct t.run(...) inserts for the initial USDC liquid
// balance so recordAction("stake") has something to debit.
import { convexTest, type TestConvex } from "convex-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"

const modules = import.meta.glob("./**/*.*s")

type T = TestConvex<typeof schema>

const WALLET_A = "0xAbC0000000000000000000000000000000000001"
const WALLET_B = "0xAbC0000000000000000000000000000000000002"

const USDC_PRICE = 1
const USDC_REWARD_APY = 3.12 // matches UMBRELLA_MARKETS.usdc.rewardApy in convex/sandbox/umbrella.ts
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60
const DAY_MS = 24 * 60 * 60 * 1000
const COOLDOWN_MS = 20 * DAY_MS
const WITHDRAWAL_WINDOW_MS = 2 * DAY_MS

async function seedLiquidUsdc(t: T, wallet: string, amount: number) {
  await t.run(async (ctx) => {
    await ctx.db.insert("sandboxBalances", {
      wallet: wallet.toLowerCase(),
      assetSlug: "usdc",
      symbol: "USDC",
      amount,
      valueUsd: amount * USDC_PRICE,
      priceUsd: USDC_PRICE,
      updatedAt: Date.now(),
    })
  })
}

async function readPosition(t: T, wallet: string, marketId: string) {
  return t.run(async (ctx) => {
    return ctx.db
      .query("positions")
      .withIndex("by_wallet_product_market", (q) =>
        q.eq("wallet", wallet.toLowerCase()).eq("product", "umbrella").eq("marketSlug", marketId),
      )
      .unique()
  })
}

async function readLiquid(t: T, wallet: string, marketId: string) {
  return t.run(async (ctx) => {
    const row = await ctx.db
      .query("sandboxBalances")
      .withIndex("by_wallet_asset", (q) => q.eq("wallet", wallet.toLowerCase()).eq("assetSlug", marketId))
      .unique()
    return row?.amount ?? 0
  })
}

async function activityCountFor(t: T, wallet: string, kind: string) {
  return t.run(async (ctx) => {
    const rows = await ctx.db
      .query("sandboxActivity")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet.toLowerCase()))
      .collect()
    return rows.filter((row) => row.kind === kind).length
  })
}

function num(usd6: string | undefined) {
  return Number(BigInt(usd6 ?? "0")) / 1_000_000
}

describe("sandbox umbrella — recordAction lifecycle", () => {
  test("stake — happy path debits liquid and creates the position + transaction", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    const res = await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "stake-1",
      kind: "stake",
      marketId: "usdc",
      amount: 400,
    })
    expect(res.idempotent).toBe(false)

    const position = await readPosition(t, WALLET_A, "usdc")
    expect(position).not.toBeNull()
    expect(num(position?.suppliedUsd6)).toBeCloseTo(400, 6)
    expect(position?.status).toBe("open")
    expect(await readLiquid(t, WALLET_A, "usdc")).toBeCloseTo(600, 6)

    const tx = await t.run(async (ctx) =>
      ctx.db
        .query("transactions")
        .withIndex("by_wallet_intent", (q) => q.eq("wallet", WALLET_A.toLowerCase()).eq("intentId", "stake-1"))
        .unique(),
    )
    expect(tx?.kind).toBe("stake")
    expect(tx?.product).toBe("umbrella")
  })

  test("stake — insufficient balance rejects", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await expect(
      asUser.mutation(api.sandbox.umbrella.recordAction, {
        wallet: WALLET_A,
        intentId: "stake-fail",
        kind: "stake",
        marketId: "usdc",
        amount: 5000,
      }),
    ).rejects.toThrow(/INSUFFICIENT_BALANCE/)
  })

  test("stake — zero amount rejects", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await expect(
      asUser.mutation(api.sandbox.umbrella.recordAction, {
        wallet: WALLET_A,
        intentId: "stake-zero",
        kind: "stake",
        marketId: "usdc",
        amount: 0,
      }),
    ).rejects.toThrow(/INVALID_AMOUNT/)
  })

  test("stake — idempotent by intentId (no double-debit)", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    const first = await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "dup",
      kind: "stake",
      marketId: "usdc",
      amount: 300,
    })
    const second = await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "dup",
      kind: "stake",
      marketId: "usdc",
      amount: 300,
    })
    expect(first.idempotent).toBe(false)
    expect(second.idempotent).toBe(true)
    expect(await readLiquid(t, WALLET_A, "usdc")).toBeCloseTo(700, 6)
    const position = await readPosition(t, WALLET_A, "usdc")
    expect(num(position?.suppliedUsd6)).toBeCloseTo(300, 6)
  })

  test("stake more — accumulates into a single position row, cooldown untouched", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 400,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s2",
      kind: "stake",
      marketId: "usdc",
      amount: 300,
    })

    const positions = await t.run(async (ctx) =>
      ctx.db
        .query("positions")
        .withIndex("by_wallet_product_market", (q) =>
          q.eq("wallet", WALLET_A.toLowerCase()).eq("product", "umbrella").eq("marketSlug", "usdc"),
        )
        .collect(),
    )
    expect(positions).toHaveLength(1)
    expect(num(positions[0]?.suppliedUsd6)).toBeCloseTo(700, 6)
    expect(num(positions[0]?.cooldownAmountUsd6)).toBe(0)
    expect(positions[0]?.cooldownEndsAt).toBeUndefined()
  })

  test("claim — happy path zeroes earned, grows claimed, principal untouched", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    // Seed a position with an already-accrued reward. Use `rewardCheckpointAt`
    // in the past so `rewardAccruedUsd` folds in a small elapsed accrual too.
    await t.run(async (ctx) => {
      const now = Date.now()
      await ctx.db.insert("positions", {
        wallet: WALLET_A.toLowerCase(),
        product: "umbrella",
        marketSlug: "usdc",
        assetId: "usdc",
        status: "open",
        suppliedUsd6: String(500_000_000),
        earnedUsd6: String(2_000_000), // $2 already earned
        supplyApyPct: 4.84,
        cooldownAmountUsd6: "0",
        claimedRewardsUsd6: "0",
        openedAt: now - DAY_MS,
        lastUpdatedAt: now - DAY_MS,
        rewardCheckpointAt: now - DAY_MS,
        revision: 1,
      })
    })
    const asUser = t.withIdentity({ subject: WALLET_A })
    const res = await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "claim-1",
      kind: "claim",
      marketId: "usdc",
      amount: 0,
    })
    expect(res.idempotent).toBe(false)

    const position = await readPosition(t, WALLET_A, "usdc")
    expect(num(position?.suppliedUsd6)).toBeCloseTo(500, 6)
    expect(num(position?.earnedUsd6)).toBe(0)
    expect(num(position?.claimedRewardsUsd6)).toBeGreaterThan(2 - 0.000001)
  })

  test("claim — with accrued time reports rewards matching principal * apy * elapsed / secondsPerYear", async () => {
    const t = convexTest(schema, modules)
    // Set up: SANDBOX_DEV_CONTROLS enabled so we can advance the reward clock.
    process.env.SANDBOX_DEV_CONTROLS = "true"
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 400,
    })
    // Shift the reward checkpoint 24h into the past (equivalent to 24h elapsed).
    await asUser.mutation(api.sandbox.dev.advanceCooldown, {
      wallet: WALLET_A,
      marketId: "usdc",
      byMs: DAY_MS,
    })
    const session = await asUser.query(api.sandbox.umbrella.getSessionState, { wallet: WALLET_A })
    const position = session.positions.find((row) => row.marketId === "usdc")
    const expected = 400 * (USDC_REWARD_APY / 100) * (DAY_MS / 1000 / SECONDS_PER_YEAR)
    expect(position?.pendingRewardsUsd).toBeGreaterThan(expected - 1e-6)
    expect(position?.pendingRewardsUsd).toBeLessThan(expected + 1e-6)
    delete process.env.SANDBOX_DEV_CONTROLS
  })

  test("claim — no position rejects with NO_REWARDS", async () => {
    // A fresh stake immediately followed by claim would accrue a few ms of
    // rewards (rewardCheckpointAt is set to `now` but Date.now() ticks
    // forward before claim reads it), so the deterministic NO_REWARDS case
    // is "no position exists". This also documents the `!position` half of
    // the guard clause in recordAction.
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await expect(
      asUser.mutation(api.sandbox.umbrella.recordAction, {
        wallet: WALLET_A,
        intentId: "claim-empty",
        kind: "claim",
        marketId: "usdc",
        amount: 0,
      }),
    ).rejects.toThrow(/NO_REWARDS/)
  })

  test("claim — does not touch principal or cooldown timers", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 400,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 200,
    })
    // Give the position a bit of earned reward so claim has something to zero.
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("positions")
        .withIndex("by_wallet_product_market", (q) =>
          q.eq("wallet", WALLET_A.toLowerCase()).eq("product", "umbrella").eq("marketSlug", "usdc"),
        )
        .unique()
      if (row) await ctx.db.patch(row._id, { earnedUsd6: String(3_000_000) })
    })
    const before = await readPosition(t, WALLET_A, "usdc")
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "claim-2",
      kind: "claim",
      marketId: "usdc",
      amount: 0,
    })
    const after = await readPosition(t, WALLET_A, "usdc")
    expect(after?.suppliedUsd6).toBe(before?.suppliedUsd6)
    expect(after?.cooldownAmountUsd6).toBe(before?.cooldownAmountUsd6)
    expect(after?.cooldownEndsAt).toBe(before?.cooldownEndsAt)
    expect(after?.cooldownStartedAt).toBe(before?.cooldownStartedAt)
    expect(after?.withdrawalWindowEndsAt).toBe(before?.withdrawalWindowEndsAt)
  })

  test("claim — subsequent stakes accrue from the post-claim checkpoint", async () => {
    const t = convexTest(schema, modules)
    process.env.SANDBOX_DEV_CONTROLS = "true"
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 400,
    })
    // Age the reward clock by 12h, claim, stake more, then age again.
    await asUser.mutation(api.sandbox.dev.advanceCooldown, {
      wallet: WALLET_A,
      marketId: "usdc",
      byMs: 12 * 60 * 60 * 1000,
    })
    // Force a positive earnedUsd6 so the claim doesn't reject NO_REWARDS.
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("positions")
        .withIndex("by_wallet_product_market", (q) =>
          q.eq("wallet", WALLET_A.toLowerCase()).eq("product", "umbrella").eq("marketSlug", "usdc"),
        )
        .unique()
      if (row) await ctx.db.patch(row._id, { earnedUsd6: String(1_000_000) })
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "claim",
      marketId: "usdc",
      amount: 0,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s2",
      kind: "stake",
      marketId: "usdc",
      amount: 200,
    })
    // Shift 6h back — expect accrual only on the 6h since the second stake's
    // checkpoint (both claim and stake reset rewardCheckpointAt to `now`).
    await asUser.mutation(api.sandbox.dev.advanceCooldown, {
      wallet: WALLET_A,
      marketId: "usdc",
      byMs: 6 * 60 * 60 * 1000,
    })
    const session = await asUser.query(api.sandbox.umbrella.getSessionState, { wallet: WALLET_A })
    const position = session.positions.find((row) => row.marketId === "usdc")
    const expected = 600 * (USDC_REWARD_APY / 100) * ((6 * 60 * 60) / SECONDS_PER_YEAR)
    // Allow a broad tolerance — the point is that rewards are based on 6h of
    // the ~600 combined principal, not on the whole 18h since the first stake.
    expect(position?.pendingRewardsUsd).toBeGreaterThan(expected - 1e-4)
    expect(position?.pendingRewardsUsd).toBeLessThan(expected + 1e-4)
    delete process.env.SANDBOX_DEV_CONTROLS
  })

  test("startCooldown — partial cooldown sets timers, principal unchanged", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1500)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    const stakedAt = Date.now()
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 400,
    })
    const position = await readPosition(t, WALLET_A, "usdc")
    expect(num(position?.suppliedUsd6)).toBeCloseTo(1000, 6)
    expect(num(position?.cooldownAmountUsd6)).toBeCloseTo(400, 6)
    // Cooldown ends 20d out, withdrawal window ends 22d out (small margin for clock drift).
    expect(position?.cooldownEndsAt).toBeGreaterThan(stakedAt + COOLDOWN_MS - 5_000)
    expect(position?.withdrawalWindowEndsAt).toBeGreaterThan(stakedAt + COOLDOWN_MS + WITHDRAWAL_WINDOW_MS - 5_000)
  })

  test("startCooldown — full cooldown accepted", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1500)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 1000,
    })
    const position = await readPosition(t, WALLET_A, "usdc")
    expect(num(position?.cooldownAmountUsd6)).toBeCloseTo(1000, 6)
    expect(num(position?.suppliedUsd6)).toBeCloseTo(1000, 6)
  })

  test("startCooldown — over-active portion rejects", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1500)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    await expect(
      asUser.mutation(api.sandbox.umbrella.recordAction, {
        wallet: WALLET_A,
        intentId: "c1",
        kind: "startCooldown",
        marketId: "usdc",
        amount: 1500,
      }),
    ).rejects.toThrow(/INVALID_COOLDOWN_AMOUNT/)
  })

  test("startCooldown — active tranche blocks a new tranche; still blocked after window expires", async () => {
    // A future refactor is planned to support multi-tranche cooldowns; until
    // then, an unresolved tranche (either still cooling or expired-unclaimed)
    // blocks a new tranche until the wallet unstakes the current one.
    const t = convexTest(schema, modules)
    process.env.SANDBOX_DEV_CONTROLS = "true"
    await seedLiquidUsdc(t, WALLET_A, 2000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 400,
    })
    await expect(
      asUser.mutation(api.sandbox.umbrella.recordAction, {
        wallet: WALLET_A,
        intentId: "c2",
        kind: "startCooldown",
        marketId: "usdc",
        amount: 200,
      }),
    ).rejects.toThrow(/COOLDOWN_ALREADY_ACTIVE/)
    // Push cooldown/window entirely into the past — tranche still unresolved.
    await asUser.mutation(api.sandbox.dev.advanceCooldown, {
      wallet: WALLET_A,
      marketId: "usdc",
      byMs: 25 * DAY_MS,
    })
    await expect(
      asUser.mutation(api.sandbox.umbrella.recordAction, {
        wallet: WALLET_A,
        intentId: "c3",
        kind: "startCooldown",
        marketId: "usdc",
        amount: 200,
      }),
    ).rejects.toThrow(/COOLDOWN_ALREADY_ACTIVE/)
    delete process.env.SANDBOX_DEV_CONTROLS
  })

  test("stake during cooldown — new stake does not inherit cooldown", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 2000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 400,
    })
    const cooldownEndsBefore = (await readPosition(t, WALLET_A, "usdc"))?.cooldownEndsAt
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s2",
      kind: "stake",
      marketId: "usdc",
      amount: 500,
    })
    const position = await readPosition(t, WALLET_A, "usdc")
    expect(num(position?.suppliedUsd6)).toBeCloseTo(1500, 6)
    expect(num(position?.cooldownAmountUsd6)).toBeCloseTo(400, 6)
    expect(position?.cooldownEndsAt).toBe(cooldownEndsBefore)
    // Derived: active = supplied - cooling = 1100, cooling = 400.
    const active = num(position?.suppliedUsd6) - num(position?.cooldownAmountUsd6)
    expect(active).toBeCloseTo(1100, 6)
  })

  test("unstake — before cooldown ends rejects", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1500)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 400,
    })
    await expect(
      asUser.mutation(api.sandbox.umbrella.recordAction, {
        wallet: WALLET_A,
        intentId: "u1",
        kind: "unstake",
        marketId: "usdc",
        amount: 400,
      }),
    ).rejects.toThrow(/COOLDOWN_NOT_READY/)
  })

  test("unstake — during withdrawal window succeeds and credits the liquid balance", async () => {
    const t = convexTest(schema, modules)
    process.env.SANDBOX_DEV_CONTROLS = "true"
    await seedLiquidUsdc(t, WALLET_A, 1500)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 400,
    })
    // Age the position so we're inside the withdrawal window.
    await asUser.mutation(api.sandbox.dev.advanceCooldown, {
      wallet: WALLET_A,
      marketId: "usdc",
      byMs: 21 * DAY_MS,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "u1",
      kind: "unstake",
      marketId: "usdc",
      amount: 400,
    })
    const position = await readPosition(t, WALLET_A, "usdc")
    expect(num(position?.suppliedUsd6)).toBeCloseTo(600, 6)
    expect(num(position?.cooldownAmountUsd6)).toBeCloseTo(0, 6)
    expect(await readLiquid(t, WALLET_A, "usdc")).toBeCloseTo(900, 6) // 500 leftover + 400 unstaked
    delete process.env.SANDBOX_DEV_CONTROLS
  })

  test("unstake — fully closes the position when the last dollar is withdrawn", async () => {
    const t = convexTest(schema, modules)
    process.env.SANDBOX_DEV_CONTROLS = "true"
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 1000,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      marketId: "usdc",
      intentId: "adv",
      kind: "claim",
      amount: 0,
    }).catch(() => {}) // Ignore — this claim path is defensive.
    await asUser.mutation(api.sandbox.dev.advanceCooldown, {
      wallet: WALLET_A,
      marketId: "usdc",
      byMs: 21 * DAY_MS,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "u1",
      kind: "unstake",
      marketId: "usdc",
      amount: 1000,
    })
    const position = await readPosition(t, WALLET_A, "usdc")
    expect(position?.status).toBe("closed")
    expect(position?.closedAt).toBeGreaterThan(0)
    delete process.env.SANDBOX_DEV_CONTROLS
  })

  test("unstake — expired withdrawal window rejects; getSessionState marks expired", async () => {
    const t = convexTest(schema, modules)
    process.env.SANDBOX_DEV_CONTROLS = "true"
    await seedLiquidUsdc(t, WALLET_A, 1500)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 400,
    })
    await asUser.mutation(api.sandbox.dev.advanceCooldown, {
      wallet: WALLET_A,
      marketId: "usdc",
      byMs: 25 * DAY_MS,
    })
    await expect(
      asUser.mutation(api.sandbox.umbrella.recordAction, {
        wallet: WALLET_A,
        intentId: "u1",
        kind: "unstake",
        marketId: "usdc",
        amount: 400,
      }),
    ).rejects.toThrow(/WITHDRAWAL_WINDOW_EXPIRED/)
    const session = await asUser.query(api.sandbox.umbrella.getSessionState, { wallet: WALLET_A })
    const position = session.positions.find((row) => row.marketId === "usdc")
    expect(position?.withdrawalWindowExpired).toBe(true)
    delete process.env.SANDBOX_DEV_CONTROLS
  })

  test("unstake — partial within the withdrawal window leaves the cooldown clock intact", async () => {
    const t = convexTest(schema, modules)
    process.env.SANDBOX_DEV_CONTROLS = "true"
    await seedLiquidUsdc(t, WALLET_A, 1500)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 400,
    })
    await asUser.mutation(api.sandbox.dev.advanceCooldown, {
      wallet: WALLET_A,
      marketId: "usdc",
      byMs: 21 * DAY_MS,
    })
    const cooldownEndsBefore = (await readPosition(t, WALLET_A, "usdc"))?.cooldownEndsAt
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "u1",
      kind: "unstake",
      marketId: "usdc",
      amount: 200,
    })
    const position = await readPosition(t, WALLET_A, "usdc")
    expect(num(position?.cooldownAmountUsd6)).toBeCloseTo(200, 6)
    expect(position?.cooldownEndsAt).toBe(cooldownEndsBefore)
    delete process.env.SANDBOX_DEV_CONTROLS
  })

  test("rewards keep accruing during cooldown", async () => {
    const t = convexTest(schema, modules)
    process.env.SANDBOX_DEV_CONTROLS = "true"
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 1000,
    })
    await asUser.mutation(api.sandbox.dev.advanceCooldown, {
      wallet: WALLET_A,
      marketId: "usdc",
      byMs: 10 * DAY_MS,
    })
    const session = await asUser.query(api.sandbox.umbrella.getSessionState, { wallet: WALLET_A })
    const position = session.positions.find((row) => row.marketId === "usdc")
    const expected = 1000 * (USDC_REWARD_APY / 100) * ((10 * DAY_MS) / 1000 / SECONDS_PER_YEAR)
    expect(position?.pendingRewardsUsd).toBeGreaterThan(expected * 0.99)
    expect(position?.pendingRewardsUsd).toBeLessThan(expected * 1.01)
    delete process.env.SANDBOX_DEV_CONTROLS
  })
})

describe("sandbox umbrella — dev controls, deficit + slash", () => {
  beforeEach(() => {
    process.env.SANDBOX_DEV_CONTROLS = "true"
  })
  afterEach(() => {
    delete process.env.SANDBOX_DEV_CONTROLS
  })

  test("simulateSlash — deficit ≤ offset is a no-op", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asUser = t.withIdentity({ subject: WALLET_A })
    await asUser.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 800,
    })
    // usdc catalog offset = 500_000; a small realized loss won't exceed it.
    await asUser.mutation(api.sandbox.umbrella.simulateDeficit, {
      wallet: WALLET_A,
      marketId: "usdc",
      realizedUsd: 100_000,
    })
    const res = await asUser.mutation(api.sandbox.umbrella.simulateSlash, {
      wallet: WALLET_A,
      marketId: "usdc",
    })
    expect(res.slashedUsd).toBe(0)
    const position = await readPosition(t, WALLET_A, "usdc")
    expect(num(position?.suppliedUsd6)).toBeCloseTo(800, 6)
  })

  test("simulateSlash — deficit above offset slashes pro-rata across wallets and grows totalSlashedUsd", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    await seedLiquidUsdc(t, WALLET_B, 1000)
    const asA = t.withIdentity({ subject: WALLET_A })
    const asB = t.withIdentity({ subject: WALLET_B })
    await asA.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "sa",
      kind: "stake",
      marketId: "usdc",
      amount: 800,
    })
    await asB.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_B,
      intentId: "sb",
      kind: "stake",
      marketId: "usdc",
      amount: 200,
    })
    // deficit 500_100 = offset 500_000 + 100 → slashable 100.
    await asA.mutation(api.sandbox.umbrella.simulateDeficit, {
      wallet: WALLET_A,
      marketId: "usdc",
      realizedUsd: 500_100,
    })
    const res = await asA.mutation(api.sandbox.umbrella.simulateSlash, {
      wallet: WALLET_A,
      marketId: "usdc",
    })
    expect(res.slashedUsd).toBeCloseTo(100, 6)
    expect(res.affected).toBe(2)
    const posA = await readPosition(t, WALLET_A, "usdc")
    const posB = await readPosition(t, WALLET_B, "usdc")
    // Pro-rata: A had 80% of the pot → seized 80, B had 20% → seized 20.
    expect(num(posA?.suppliedUsd6)).toBeCloseTo(720, 5)
    expect(num(posB?.suppliedUsd6)).toBeCloseTo(180, 5)

    // Both wallets got an umbrella_slash activity row.
    expect(await activityCountFor(t, WALLET_A, "umbrella_slash")).toBe(1)
    expect(await activityCountFor(t, WALLET_B, "umbrella_slash")).toBe(1)

    const overlay = await t.run(async (ctx) =>
      ctx.db
        .query("umbrellaMarketState")
        .withIndex("by_market", (q) => q.eq("marketId", "usdc"))
        .unique(),
    )
    expect(overlay?.totalSlashedUsd).toBeCloseTo(100, 6)
  })

  test("simulateSlash — cooling capital is slashable pro-rata alongside active capital", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asA = t.withIdentity({ subject: WALLET_A })
    await asA.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    await asA.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 400,
    })
    // Slashable pot = supplied 1000 + cooldown 400 = 1400. Slashable amount = 140 (10%).
    await asA.mutation(api.sandbox.umbrella.simulateDeficit, {
      wallet: WALLET_A,
      marketId: "usdc",
      realizedUsd: 500_140,
    })
    const res = await asA.mutation(api.sandbox.umbrella.simulateSlash, {
      wallet: WALLET_A,
      marketId: "usdc",
    })
    expect(res.slashedUsd).toBeCloseTo(140, 5)
    const position = await readPosition(t, WALLET_A, "usdc")
    // 10% ratio → supplied shrinks by 100 (1000 * 0.1), cooldown by 40 (400 * 0.1).
    expect(num(position?.suppliedUsd6)).toBeCloseTo(900, 5)
    expect(num(position?.cooldownAmountUsd6)).toBeCloseTo(360, 5)
  })

  test("simulateSlash — closed positions are exempt", async () => {
    const t = convexTest(schema, modules)
    // Seed a closed position + an open one for the same market.
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asA = t.withIdentity({ subject: WALLET_A })
    await asA.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 500,
    })
    // Insert a second (closed) position row directly for a different (unused)
    // wallet so the `by_product_market` scan sees a closed row and skips it.
    await t.run(async (ctx) => {
      await ctx.db.insert("positions", {
        wallet: WALLET_B.toLowerCase(),
        product: "umbrella",
        marketSlug: "usdc",
        assetId: "usdc",
        status: "closed",
        suppliedUsd6: String(200_000_000),
        earnedUsd6: "0",
        supplyApyPct: 4.84,
        cooldownAmountUsd6: "0",
        claimedRewardsUsd6: "0",
        openedAt: 0,
        lastUpdatedAt: 0,
        rewardCheckpointAt: 0,
        closedAt: 0,
        revision: 1,
      })
    })
    await asA.mutation(api.sandbox.umbrella.simulateDeficit, {
      wallet: WALLET_A,
      marketId: "usdc",
      realizedUsd: 500_050,
    })
    await asA.mutation(api.sandbox.umbrella.simulateSlash, {
      wallet: WALLET_A,
      marketId: "usdc",
    })
    // Only the open position was reduced.
    const openPos = await readPosition(t, WALLET_A, "usdc")
    expect(num(openPos?.suppliedUsd6)).toBeCloseTo(450, 5) // 500 - 50 slash
    const closedPos = await readPosition(t, WALLET_B, "usdc")
    expect(num(closedPos?.suppliedUsd6)).toBeCloseTo(200, 6)
  })

  test("simulateSlash — post-slash rewards accrue from the reduced principal", async () => {
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asA = t.withIdentity({ subject: WALLET_A })
    await asA.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 1000,
    })
    // Slash 10% of the principal.
    await asA.mutation(api.sandbox.umbrella.simulateDeficit, {
      wallet: WALLET_A,
      marketId: "usdc",
      realizedUsd: 500_100,
    })
    await asA.mutation(api.sandbox.umbrella.simulateSlash, {
      wallet: WALLET_A,
      marketId: "usdc",
    })
    await asA.mutation(api.sandbox.dev.advanceCooldown, {
      wallet: WALLET_A,
      marketId: "usdc",
      byMs: DAY_MS,
    })
    const session = await asA.query(api.sandbox.umbrella.getSessionState, { wallet: WALLET_A })
    const position = session.positions.find((row) => row.marketId === "usdc")
    // Post-slash principal is 900, so 24h rewards are principal * apy * 1/365.
    const expected = 900 * (USDC_REWARD_APY / 100) * ((DAY_MS / 1000) / SECONDS_PER_YEAR)
    expect(position?.pendingRewardsUsd).toBeGreaterThan(expected * 0.99)
    expect(position?.pendingRewardsUsd).toBeLessThan(expected * 1.01)
  })

  test("dev controls throw when SANDBOX_DEV_CONTROLS is not enabled", async () => {
    delete process.env.SANDBOX_DEV_CONTROLS
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asA = t.withIdentity({ subject: WALLET_A })
    await asA.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 500,
    })
    await expect(
      asA.mutation(api.sandbox.dev.advanceCooldown, { wallet: WALLET_A, marketId: "usdc", byMs: 1000 }),
    ).rejects.toThrow(/DEV_CONTROLS_DISABLED/)
    await expect(
      asA.mutation(api.sandbox.umbrella.simulateDeficit, {
        wallet: WALLET_A,
        marketId: "usdc",
        realizedUsd: 1,
      }),
    ).rejects.toThrow(/DEV_CONTROLS_DISABLED/)
    await expect(
      asA.mutation(api.sandbox.umbrella.simulateSlash, { wallet: WALLET_A, marketId: "usdc" }),
    ).rejects.toThrow(/DEV_CONTROLS_DISABLED/)
  })
})

describe("sandbox umbrella — getSessionState", () => {
  test("markets fold live deficit for one market and leave the rest at catalog", async () => {
    process.env.SANDBOX_DEV_CONTROLS = "true"
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asA = t.withIdentity({ subject: WALLET_A })
    await asA.mutation(api.sandbox.umbrella.simulateDeficit, {
      wallet: WALLET_A,
      marketId: "usdc",
      realizedUsd: 700_000,
    })
    const session = await asA.query(api.sandbox.umbrella.getSessionState, { wallet: WALLET_A })
    expect(session.markets.usdc.currentDeficitUsd).toBeCloseTo(700_000, 6)
    // Other markets untouched → still at catalog defaults.
    expect(session.markets.gho.currentDeficitUsd).toBe(146)
    expect(session.markets.weth.currentDeficitUsd).toBe(52_973)
    delete process.env.SANDBOX_DEV_CONTROLS
  })

  test("walletBalances mirror sandboxBalances after stake + unstake", async () => {
    process.env.SANDBOX_DEV_CONTROLS = "true"
    const t = convexTest(schema, modules)
    await seedLiquidUsdc(t, WALLET_A, 1000)
    const asA = t.withIdentity({ subject: WALLET_A })
    await asA.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "s1",
      kind: "stake",
      marketId: "usdc",
      amount: 400,
    })
    await asA.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "c1",
      kind: "startCooldown",
      marketId: "usdc",
      amount: 400,
    })
    await asA.mutation(api.sandbox.dev.advanceCooldown, {
      wallet: WALLET_A,
      marketId: "usdc",
      byMs: 21 * DAY_MS,
    })
    await asA.mutation(api.sandbox.umbrella.recordAction, {
      wallet: WALLET_A,
      intentId: "u1",
      kind: "unstake",
      marketId: "usdc",
      amount: 400,
    })
    const session = await asA.query(api.sandbox.umbrella.getSessionState, { wallet: WALLET_A })
    expect(session.walletBalances.usdc).toBeCloseTo(await readLiquid(t, WALLET_A, "usdc"), 6)
    expect(session.walletBalances.usdc).toBeCloseTo(1000, 6)
    delete process.env.SANDBOX_DEV_CONTROLS
  })
})
