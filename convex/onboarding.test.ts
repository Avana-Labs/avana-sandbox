// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"
import { STARTER_TEST_MARKETS } from "./starterTestMarkets"

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
    await t.run(async (ctx) => {
      for (const market of STARTER_TEST_MARKETS) {
        await ctx.db.insert("markets", { ...market, chainId: 1, createdAt: 0 })
      }
    })

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

  test("claim seeds wallet-scoped starter state (position + portfolio snapshot)", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await t.run(async (ctx) => {
      for (const market of STARTER_TEST_MARKETS) {
        await ctx.db.insert("markets", { ...market, chainId: 1, createdAt: 0 })
      }
    })
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
})
