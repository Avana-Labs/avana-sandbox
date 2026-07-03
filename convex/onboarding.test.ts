// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"
import { seedStarterTestMarkets, starterTestPriceFor, STARTER_TEST_MARKETS } from "./starterTestMarkets"

// Rooted at the convex directory so convex-test can resolve "sandbox/onboarding".
const modules = import.meta.glob("./**/*.*s")

const WALLET = "0xAbC0000000000000000000000000000000000001"

describe("sandbox onboarding + economy caps", () => {
  test("rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules)
    await expect(t.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })).rejects.toThrow(
      /UNAUTHENTICATED/,
    )
  })

  test("rejects a wallet that does not match the authenticated identity", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: "0xdifferent" })).rejects.toThrow(
      /WALLET_MISMATCH/,
    )
  })

  test("persists analyzing before eligibility is completed", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })

    expect(await asUser.mutation(api.sandbox.onboarding.beginAnalysis, { wallet: WALLET })).toBe("analyzing")
    expect((await asUser.query(api.sandbox.onboarding.getState, { wallet: WALLET })).onboardingStep).toBe("analyzing")

    expect(await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })).toBe("eligible")
    expect((await asUser.query(api.sandbox.onboarding.getState, { wallet: WALLET })).onboardingStep).toBe("eligible")
  })

  test("claim allocates the basket, marks done, and increments the economy atomically", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await t.run(seedStarterTestMarkets)

    await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })
    expect(await asUser.mutation(api.sandbox.onboarding.beginClaim, { wallet: WALLET })).toBe("claimPending")
    expect((await asUser.query(api.sandbox.onboarding.getState, { wallet: WALLET })).onboardingStep).toBe("claimPending")
    const result = await asUser.mutation(api.sandbox.onboarding.claim, { wallet: WALLET })

    expect(result.status).toBe("done")
    expect(result.allocatedUsd ?? 0).toBeGreaterThan(0)

    const state = await asUser.query(api.sandbox.onboarding.getState, { wallet: WALLET })
    expect(state.onboardingStep).toBe("done")
    expect(state.economy.userCount).toBe(1)

    const activity = await t.run(async (ctx) =>
      ctx.db
        .query("sandboxActivity")
        .withIndex("by_wallet_at", (q) => q.eq("wallet", WALLET.toLowerCase()))
        .collect(),
    )
    expect(activity).toHaveLength(13)
    expect(activity.some((entry) => entry.kind === "onboardingClaim")).toBe(true)
  })

  test("X/tweet sub-flow: startTweet → xPending, confirmTweet → xConfirmed", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })

    expect(await asUser.mutation(api.sandbox.onboarding.startTweet, { wallet: WALLET })).toBe("xPending")
    expect(
      await asUser.mutation(api.sandbox.onboarding.confirmTweet, {
        wallet: WALLET,
        xHandle: "@avana",
        tweetUrl: "https://x.com/avana/status/1",
      }),
    ).toBe("xConfirmed")

    const state = await asUser.query(api.sandbox.onboarding.getState, { wallet: WALLET })
    expect(state.onboardingStep).toBe("xConfirmed")
    expect(state.profile?.tweetUrl).toBe("https://x.com/avana/status/1")
  })

  test("skipping X preserves the same allocation and advances to claim", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })
    const beforeSkip = await asUser.query(api.sandbox.onboarding.getState, { wallet: WALLET })

    expect(await asUser.mutation(api.sandbox.onboarding.skipTweet, { wallet: WALLET })).toBe("xConfirmed")

    const state = await asUser.query(api.sandbox.onboarding.getState, { wallet: WALLET })
    expect(state.onboardingStep).toBe("xConfirmed")
    expect(state.profile?.eligibilityTier).toBe(beforeSkip.profile?.eligibilityTier)
    expect(state.economy.perUserTargetUsd).toBe(1_000_000)
    expect(state.profile?.tweetUrl).toBeUndefined()
  })

  test("claim seeds wallet-scoped starter state (position + portfolio snapshot)", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await t.run(seedStarterTestMarkets)
    await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })
    const result = await asUser.mutation(api.sandbox.onboarding.claim, { wallet: WALLET })
    expect(result.status).toBe("done")

    const positions = await asUser.query(api.sandbox.transactions.getPositions, { wallet: WALLET })
    expect(positions).toHaveLength(22)
    expect(positions.filter((position) => position.product === "borrow")).toHaveLength(8)
    expect(positions.filter((position) => position.product === "lend")).toHaveLength(8)
    expect(positions.filter((position) => position.product === "multiply")).toHaveLength(6)

    const balances = await t.run((ctx) =>
      ctx.db
        .query("sandboxBalances")
        .withIndex("by_wallet", (queryBuilder) => queryBuilder.eq("wallet", WALLET.toLowerCase()))
        .collect(),
    )
    expect(balances).toHaveLength(12)
    expect(Math.round(balances.reduce((sum, balance) => sum + balance.valueUsd, 0) * 100)).toBe(100_000 * 100)

    const portfolio = await asUser.query(api.sandbox.transactions.getPortfolio, { wallet: WALLET })
    expect(portfolio.snapshots).toHaveLength(1)
    expect(portfolio.latest?.totalValueUsd).toBe(1_000_000)
    expect(portfolio.latest?.totalSuppliedUsd).toBe(1_150_000)
    expect(portfolio.latest?.totalBorrowedUsd).toBe(250_000)
    expect(portfolio.openPositions).toBe(22)

    const receipt = await asUser.query(api.sandbox.transactions.getTransactionByHash, {
      wallet: WALLET,
      hash: result.syntheticTxHash ?? "",
    })
    expect(receipt?.syntheticTxHash).toBe(result.syntheticTxHash)

    const otherWallet = "0xAbC0000000000000000000000000000000000002"
    await expect(
      t.withIdentity({ subject: otherWallet }).query(api.sandbox.transactions.getTransactionByHash, {
        wallet: WALLET,
        hash: result.syntheticTxHash ?? "",
      }),
    ).rejects.toThrow(/WALLET_MISMATCH/)
  })

  test("economy counters are sharded off the hot claim row; live counts stay exact", async () => {
    const t = convexTest(schema, modules)
    await t.run(seedStarterTestMarkets)

    const N = 12
    for (let i = 0; i < N; i++) {
      const w = `0x${(i + 1).toString(16).padStart(40, "0")}`
      const asUser = t.withIdentity({ subject: w })
      await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: w })
      const res = await asUser.mutation(api.sandbox.onboarding.claim, { wallet: w })
      expect(res.status).toBe("done")
    }

    const { singletonUserCount, shardedUserCount, shardRows, starterCatalogRows } = await t.run(async (ctx) => {
      const economy = await ctx.db.query("sandboxEconomy").first()
      const shards = await ctx.db.query("sandboxEconomyShards").collect()
      const starterCatalog = await ctx.db.query("sandboxStarterCatalog").collect()
      return {
        singletonUserCount: economy?.userCount ?? 0,
        shardedUserCount: shards.reduce((sum, s) => sum + s.userCount, 0),
        shardRows: shards.length,
        starterCatalogRows: starterCatalog.length,
      }
    })

    // The hot singleton row is never incremented on the claim path — the count lives
    // entirely in shards, so concurrent claims write disjoint rows (no OCC contention).
    expect(singletonUserCount).toBe(0)
    // Every claim landed on exactly one shard; the sum is exact.
    expect(shardedUserCount).toBe(N)
    // Claims are spread across multiple shard rows, not folded onto a single document.
    expect(shardRows).toBeGreaterThan(1)
    expect(starterCatalogRows).toBe(1)

    // getState surfaces the summed live count to the client.
    const lastWallet = `0x${N.toString(16).padStart(40, "0")}`
    const state = await t.withIdentity({ subject: lastWallet }).query(api.sandbox.onboarding.getState, { wallet: lastWallet })
    expect(state.economy.userCount).toBe(N)
  })

  test("enforces userCap server-side: claims past the cap are waitlisted", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert("sandboxEconomy", {
        userCap: 1,
        totalGrantedUsdCap: 10_000_000_000,
        perUserTargetUsd: 1_000_000,
        minMultiplier: 0.8,
        maxMultiplier: 1.2,
        userCount: 1,
        totalGrantedUsd: 1_000_000,
        status: "open",
      })
    })
    const asUser = t.withIdentity({ subject: WALLET })
    await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })
    const result = await asUser.mutation(api.sandbox.onboarding.claim, { wallet: WALLET })

    expect(result.status).toBe("waitlisted")
    const state = await asUser.query(api.sandbox.onboarding.getState, { wallet: WALLET })
    expect(state.onboardingStep).toBe("waitlisted")
    expect(state.economy.userCount).toBe(1)
  })

  test("closes the economy atomically on the final allowed claim", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await seedStarterTestMarkets(ctx)
      await ctx.db.insert("sandboxEconomy", {
        userCap: 1,
        totalGrantedUsdCap: 10_000_000_000,
        perUserTargetUsd: 1_000_000,
        minMultiplier: 0.8,
        maxMultiplier: 1.2,
        userCount: 0,
        totalGrantedUsd: 0,
        status: "open",
      })
    })
    const asUser = t.withIdentity({ subject: WALLET })
    await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })
    expect((await asUser.mutation(api.sandbox.onboarding.claim, { wallet: WALLET })).status).toBe("done")

    const economy = await t.run((ctx) => ctx.db.query("sandboxEconomy").first())
    expect(economy?.status).toBe("closed")
    expect(economy?.closedReason).toBe("userCap reached")
  })

  // FIX 1 (B2): multiply `collateralAmount` is a TOKEN QUANTITY, not USD. The engine values
  // a position as collateralValueUsd = collateralAmount * price, so onboarding must store the
  // gross (leveraged) collateral in tokens; the USD it stores must equal amount * price.
  test("multiply positions store collateralAmount as a token quantity (collateralValueUsd ≈ amount * price)", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await t.run(seedStarterTestMarkets)
    await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })
    await asUser.mutation(api.sandbox.onboarding.claim, { wallet: WALLET })

    const multiplyPositions = await t.run(async (ctx) =>
      ctx.db
        .query("positions")
        .withIndex("by_wallet_market", (q) => q.eq("wallet", WALLET.toLowerCase()))
        .collect(),
    )
    const multiply = multiplyPositions.filter((p) => p.product === "multiply")
    expect(multiply).toHaveLength(6)

    const priceForSlug = (slug: string) => {
      const index = Number(slug.split("-")[1])
      return starterTestPriceFor(`MULT${index}`)
    }

    for (const position of multiply) {
      const price = priceForSlug(position.marketSlug)
      // The stored token quantity must NOT equal the USD equity (the old bug stored USD here).
      // With price ≥ 100, amount and USD differ by ~2 orders of magnitude.
      expect(position.collateralAmount).toBeDefined()
      expect(position.collateralValueUsd).toBeDefined()
      // Invariant the multiply engine relies on: collateralValueUsd = collateralAmount * price.
      expect(position.collateralAmount! * price).toBeCloseTo(position.collateralValueUsd!, 6)
      // collateralValueUsd is the GROSS (2x) exposure, so equity = value - debt and the
      // token quantity is the gross collateral, i.e. clearly less than the USD value here.
      expect(position.collateralAmount!).toBeLessThan(position.collateralValueUsd!)
      expect(position.collateralAmount!).toBeGreaterThan(0)
      // Debt is exactly half the gross exposure (multiplier 2 ⇒ equity = debt = value/2).
      expect(position.debtValueUsd!).toBeCloseTo(position.collateralValueUsd! / 2, 6)
    }
  })

  // FIX 2 (B1): the claim must FAIL CLOSED on an incomplete catalog rather than seeding a
  // partial/empty portfolio and marking the wallet "done".
  test("claim fails (does not mark done) when the catalog is entirely unseeded", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })

    await expect(asUser.mutation(api.sandbox.onboarding.claim, { wallet: WALLET })).rejects.toThrow(
      /ONBOARDING_CATALOG_INCOMPLETE/,
    )

    const state = await asUser.query(api.sandbox.onboarding.getState, { wallet: WALLET })
    expect(state.onboardingStep).not.toBe("done")
    // No portfolio was seeded.
    const positions = await asUser.query(api.sandbox.transactions.getPositions, { wallet: WALLET })
    expect(positions).toHaveLength(0)
  })

  test("claim fails (does not mark done) when a bucket is under-seeded", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    // Seed a full catalog EXCEPT the multiply bucket (only 5 of the required 6).
    await t.run(async (ctx) => {
      await seedStarterTestMarkets(ctx)
      const multiply = await ctx.db
        .query("markets")
        .withIndex("by_scope_slug", (q) => q.eq("scope", "multiply"))
        .collect()
      await ctx.db.delete(multiply[0]!._id)
    })
    await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })

    await expect(asUser.mutation(api.sandbox.onboarding.claim, { wallet: WALLET })).rejects.toThrow(
      /ONBOARDING_CATALOG_INCOMPLETE.*multiply/,
    )
    const state = await asUser.query(api.sandbox.onboarding.getState, { wallet: WALLET })
    expect(state.onboardingStep).not.toBe("done")
  })

  test("claim fails (does not mark done) when a chosen leg has no positive price", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    // Seed the full catalog but WITHOUT any tokenPrices rows — no chosen leg can be priced,
    // and the synthetic symbols aren't in the sandbox fallback table either.
    await t.run(async (ctx) => {
      for (const market of STARTER_TEST_MARKETS) {
        await ctx.db.insert("markets", { ...market, chainId: 1, createdAt: 0 })
      }
    })
    await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })

    await expect(asUser.mutation(api.sandbox.onboarding.claim, { wallet: WALLET })).rejects.toThrow(
      /ONBOARDING_CATALOG_INCOMPLETE.*positive price/,
    )
    const state = await asUser.query(api.sandbox.onboarding.getState, { wallet: WALLET })
    expect(state.onboardingStep).not.toBe("done")
  })

  // FIX 3 (C1): the steady-state gate query is wallet-only (no economy shard reads); the
  // economy status lives in a separate query used only while onboarding is in progress.
  test("getWalletOnboardingState returns wallet profile only (no economy); getEconomyStatus returns global counts", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await t.run(seedStarterTestMarkets)
    await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: WALLET })
    await asUser.mutation(api.sandbox.onboarding.claim, { wallet: WALLET })

    const walletState = await asUser.query(api.sandbox.onboarding.getWalletOnboardingState, { wallet: WALLET })
    expect(walletState.onboardingStep).toBe("done")
    expect(walletState.profile?.allocatedUsd).toBe(1_000_000)
    expect(walletState.config).toBeDefined()
    // The wallet-only query must NOT surface the global economy counters.
    expect("economy" in walletState).toBe(false)

    const economy = await asUser.query(api.sandbox.onboarding.getEconomyStatus, { wallet: WALLET })
    expect(economy.userCount).toBe(1)
    expect(economy.status).toBe("open")
    expect(economy.perUserTargetUsd).toBe(1_000_000)
  })

  test("getWalletOnboardingState and getEconomyStatus enforce wallet-identity match", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.query(api.sandbox.onboarding.getWalletOnboardingState, { wallet: "0xdifferent" }),
    ).rejects.toThrow(/WALLET_MISMATCH/)
    await expect(
      asUser.query(api.sandbox.onboarding.getEconomyStatus, { wallet: "0xdifferent" }),
    ).rejects.toThrow(/WALLET_MISMATCH/)
  })
})
