// @vitest-environment edge-runtime
//
// Multi-user Convex harness. Drives the wallet-scoped sandbox mutations across many
// identities and asserts cross-wallet invariants against PERSISTED state (not the
// in-memory engine). convex-test executes mutations sequentially, so these prove the
// server-side cap/ledger logic and per-wallet scoping rather than raw race timing —
// the cap mutation re-reads live counters every call, the property the brief requires.
//
// Scenarios: capRush (onboarding cap), calm + borrowHeavy (ledger == Σ deltas), and
// liquidationStorm-lite (a keeper records liquidations across victims).
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"
import { STARTER_TEST_MARKETS } from "./starterTestMarkets"

const modules = import.meta.glob("./**/*.*s")

/** Deterministic distinct lowercase EVM-ish address for wallet index i. */
function wallet(i: number): string {
  return `0x${(i + 1).toString(16).padStart(40, "0")}`
}

/** Deterministic RNG (mulberry32) so scenario variety is reproducible. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe("multi-user harness — capRush", () => {
  test("exactly userCap wallets claim; the rest waitlist; economy never exceeds caps", async () => {
    const t = convexTest(schema, modules)
    const USER_CAP = 3
    const PER_USER = 1_000_000
    await t.run(async (ctx) => {
      for (const market of STARTER_TEST_MARKETS) {
        await ctx.db.insert("markets", { ...market, chainId: 1, createdAt: 0 })
      }
      await ctx.db.insert("sandboxEconomy", {
        userCap: USER_CAP,
        totalGrantedUsdCap: 10_000_000_000,
        perUserTargetUsd: PER_USER,
        minMultiplier: 0.8,
        maxMultiplier: 1.2,
        userCount: 0,
        totalGrantedUsd: 0,
        status: "open",
      })
    })

    const N = 10
    let done = 0
    let waitlisted = 0
    for (let i = 0; i < N; i++) {
      const w = wallet(i)
      const asUser = t.withIdentity({ subject: w })
      await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: w })
      const res = await asUser.mutation(api.sandbox.onboarding.claim, { wallet: w })
      if (res.status === "done") done++
      else waitlisted++
    }

    expect(done).toBe(USER_CAP)
    expect(waitlisted).toBe(N - USER_CAP)

    const economy = await t.run((ctx) => ctx.db.query("sandboxEconomy").first())
    expect(economy?.userCount).toBe(USER_CAP)
    expect(economy?.userCount).toBeLessThanOrEqual(USER_CAP)
    expect(economy?.totalGrantedUsd ?? 0).toBeLessThanOrEqual(economy?.totalGrantedUsdCap ?? 0)
    expect(economy?.status).toBe("closed")
  })
})

describe("multi-user harness — calm + borrowHeavy (ledger invariant)", () => {
  test("aggregate marketLiquidityDeltas equals the sum of issued deltas across all wallets", async () => {
    const t = convexTest(schema, modules)
    const SLUG = "uni-v2:usdc"
    const random = rng(1337)
    const WALLETS = 6
    let expectedBorrowed = 0

    for (let i = 0; i < WALLETS; i++) {
      const w = wallet(i)
      const asUser = t.withIdentity({ subject: w })
      const actions = 1 + Math.floor(random() * 4) // 1..4 borrows each
      for (let a = 0; a < actions; a++) {
        const amount = Math.round(100 + random() * 900) // $100..$1000
        expectedBorrowed += amount
        await asUser.mutation(api.sandbox.transactions.recordTransaction, {
          wallet: w,
          intentId: `${w}-${a}`,
          product: "borrow",
          kind: "borrow",
          marketSlug: "uni-v3-bluechip-weth-usdc",
          assetId: SLUG,
          requestedAmountUsd6: String(amount * 1_000_000),
          executedAmountUsd6: String(amount * 1_000_000),
          amountUsd: amount,
          position: {
            status: "open",
            marketSlug: "uni-v3-bluechip-weth-usdc",
            debtValueUsd6: String(amount * 1_000_000),
            // Back the debt with collateral (2x) so the server-side solvency guard accepts
            // it — a real borrow always carries its pledged collateral.
            collateral: [
              {
                marketSlug: "uni-v3-bluechip-weth-usdc",
                collateralShares: String(amount * 2 * 1_000_000),
                principalTokenAmount: String(amount * 2 * 1_000_000),
                collateralEnabled: true,
                collateralValueUsd6: String(amount * 2 * 1_000_000),
              },
            ],
          },
          ledger: { marketSlug: SLUG, borrowedDeltaUsd: amount },
        })
      }
    }

    // Invariant 1: the shared ledger row equals the summed deltas.
    const deltas = await t.query(api.liquidity.listDeltas)
    const row = deltas.find((d) => d.marketSlug === SLUG)
    expect(row?.borrowedDeltaUsd).toBeCloseTo(expectedBorrowed, 6)

    // Invariant 2: each wallet sees only its own activity + a single open position per market.
    for (let i = 0; i < WALLETS; i++) {
      const w = wallet(i)
      const asUser = t.withIdentity({ subject: w })
      const positions = await asUser.query(api.sandbox.transactions.getPositions, { wallet: w })
      expect(positions.length).toBe(1) // all borrows hit the same market → one upserted position
      expect(positions[0]?.wallet).toBe(w)
    }
  })
})

describe("multi-user harness — liquidationStorm-lite", () => {
  test("a keeper records liquidations across multiple victims; each side sees its rows", async () => {
    const t = convexTest(schema, modules)
    const keeper = wallet(100)
    const asKeeper = t.withIdentity({ subject: keeper })
    const victims = [wallet(0), wallet(1), wallet(2)]

    for (const victim of victims) {
      await asKeeper.mutation(api.sandbox.liquidation.recordLiquidation, {
        wallet: victim,
        liquidatorWallet: keeper,
        repaidUsd6: "500000000",
        seizedCollateralUsd6: "550000000",
        healthFactorWadBefore: "900000000000000000",
        healthFactorWadAfter: "1050000000000000000",
      })
    }

    const keeperView = await asKeeper.query(api.sandbox.liquidation.getLiquidations, { wallet: keeper })
    expect(keeperView.asLiquidator.length).toBe(victims.length)

    for (const victim of victims) {
      const asVictim = t.withIdentity({ subject: victim })
      const victimView = await asVictim.query(api.sandbox.liquidation.getLiquidations, { wallet: victim })
      expect(victimView.asVictim.length).toBe(1)
      expect(victimView.asVictim[0]?.liquidatorWallet).toBe(keeper)
    }
  })
})
