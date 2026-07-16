// @vitest-environment edge-runtime

import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import { seedStarterTestMarkets } from "./starterTestMarkets"

const modules = import.meta.glob("./**/*.*s")
const USERS = 10_000
const EXPECTED_ALLOCATION_USD = 1_000_000

function wallet(index: number) {
  return `0x${(index + 1).toString(16).padStart(40, "0")}`
}

describe.skipIf(process.env.RUN_ONBOARDING_10K !== "1")("sandbox onboarding — exact 10,000-wallet capacity", () => {
  test("onboards every wallet, grants exactly $1M, and preserves wallet isolation", async () => {
    const t = convexTest(schema, modules)
    await t.run(seedStarterTestMarkets)

    const startedAt = Date.now()
    let onboarded = 0
    let failed = 0
    let allocatedUsd = 0

    for (let index = 0; index < USERS; index += 1) {
      const address = wallet(index)
      const asUser = t.withIdentity({ subject: address })
      await asUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: address })
      const result = await asUser.mutation(api.sandbox.onboarding.claim, { wallet: address })

      if (result.status === "done") {
        onboarded += 1
        allocatedUsd += result.allocatedUsd
      } else {
        failed += 1
      }

      const [state, onboarding, portfolio, activity] = await Promise.all([
        asUser.query(api.sandbox.transactions.getSessionState, { wallet: address }),
        asUser.query(api.sandbox.onboarding.getWalletOnboardingState, { wallet: address }),
        asUser.query(api.sandbox.transactions.getPortfolio, { wallet: address }),
        asUser.query(api.sandbox.transactions.getActivity, { wallet: address, limit: 200 }),
      ])
      expect(onboarding.profile?.wallet).toBe(address)
      expect(onboarding.profile?.onboardingStep).toBe("done")
      expect(onboarding.profile?.allocatedUsd).toBe(EXPECTED_ALLOCATION_USD)
      expect(portfolio.latest?.totalValueUsd).toBe(EXPECTED_ALLOCATION_USD)
      expect(state.balances.every((row) => row.wallet === address)).toBe(true)
      expect(state.positions.every((row) => row.wallet === address)).toBe(true)
      expect(activity.length).toBeGreaterThan(0)
      if (index > 0 && index % 1_000 === 0) {
        await expect(
          asUser.query(api.sandbox.transactions.getSessionState, { wallet: wallet(index - 1) }),
        ).rejects.toThrow(/WALLET_MISMATCH/)
      }
    }

    const persisted = await t.run(async (ctx) => {
      const [profiles, sessions, allocations, snapshots, economy, shards] = await Promise.all([
        ctx.db.query("sandboxProfiles").collect(),
        ctx.db.query("sandboxSessions").collect(),
        ctx.db.query("starterAllocations").collect(),
        ctx.db.query("portfolioSnapshots").collect(),
        ctx.db.query("sandboxEconomy").first(),
        ctx.db.query("sandboxEconomyShards").collect(),
      ])
      return {
        profiles: profiles.length,
        sessions: sessions.length,
        allocations: allocations.length,
        snapshots: snapshots.length,
        economyUsers: (economy?.userCount ?? 0) + shards.reduce((sum, shard) => sum + shard.userCount, 0),
        economyGrantedUsd: (economy?.totalGrantedUsd ?? 0) + shards.reduce((sum, shard) => sum + shard.grantedUsd, 0),
      }
    })

    const overflowWallet = wallet(USERS)
    const overflowUser = t.withIdentity({ subject: overflowWallet })
    await overflowUser.mutation(api.sandbox.onboarding.startAnalysis, { wallet: overflowWallet })
    const overflow = await overflowUser.mutation(api.sandbox.onboarding.claim, { wallet: overflowWallet })

    const report = {
      usersAttempted: USERS,
      onboarded,
      failed,
      allocatedUsd,
      persisted,
      overflowStatus: overflow.status,
      durationMs: Date.now() - startedAt,
    }
    // eslint-disable-next-line no-console -- durable load-test report consumed from CI logs
    console.log("ONBOARDING_10K_REPORT", JSON.stringify(report))

    expect(report).toMatchObject({
      usersAttempted: USERS,
      onboarded: USERS,
      failed: 0,
      allocatedUsd: USERS * EXPECTED_ALLOCATION_USD,
      persisted: {
        profiles: USERS,
        sessions: USERS,
        allocations: USERS,
        snapshots: USERS,
        economyUsers: USERS,
        economyGrantedUsd: USERS * EXPECTED_ALLOCATION_USD,
      },
      overflowStatus: "waitlisted",
    })
  }, 3_600_000)
})
