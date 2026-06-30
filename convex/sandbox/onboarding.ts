/**
 * Wallet-scoped sandbox onboarding + allocation.
 *
 * Caps (user count + total granted USD) are enforced SERVER-SIDE in `claim`
 * inside a single transactional mutation, so concurrent claims can never push
 * past the cap (Convex OCC serializes the increments). The client cannot bypass
 * this; it only displays the result.
 *
 * Balances/prices here are SYNTHETIC sandbox values, not a source of truth.
 */

import { v } from "convex/values"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { mutation, query } from "../_generated/server"
import { requireSandboxWallet, getAuthSubject } from "./auth"

const DEFAULT_ECONOMY = {
  userCap: 10_000,
  totalGrantedUsdCap: 10_000_000_000,
  perUserTargetUsd: 1_000_000,
  minMultiplier: 0.8,
  maxMultiplier: 1.2,
  userCount: 0,
  totalGrantedUsd: 0,
  status: "open" as const,
}

const DEFAULT_BASKET = [
  { tokenId: "usdc", weight: 0.4 },
  { tokenId: "eth", weight: 0.25 },
  { tokenId: "dai", weight: 0.1 },
  { tokenId: "wbtc", weight: 0.1 },
  { tokenId: "aave", weight: 0.1 },
  { tokenId: "uni", weight: 0.05 },
]

const SEED_VERSION = 1

/** Synthetic market slug for the basket allocated at onboarding (a starter LP supply). */
const STARTER_LP_SLUG = "sandbox-starter-basket"

// Sandbox-only fallback prices. Production reads `tokens.priceUsd` (live feeds).
const SANDBOX_TOKEN_PRICE_USD: Record<string, number> = {
  usdc: 1, dai: 1, eth: 3500, wbtc: 95_000, aave: 280, uni: 12,
}

/** Deterministic pseudo-tier in [min, max] from the wallet (sandbox stand-in for keccak256). */
function deriveTier(wallet: string, min: number, max: number): { tier: number; seed: string } {
  let hash = 2166136261
  for (let i = 0; i < wallet.length; i++) {
    hash ^= wallet.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const unit = ((hash >>> 0) % 1000) / 1000 // [0,1)
  const tier = Number((min + unit * (max - min)).toFixed(4))
  return { tier, seed: (hash >>> 0).toString(16) }
}

async function getOrSeedEconomy(ctx: MutationCtx) {
  const existing = await ctx.db.query("sandboxEconomy").first()
  if (existing) return existing
  const id = await ctx.db.insert("sandboxEconomy", DEFAULT_ECONOMY)
  return (await ctx.db.get(id))!
}

async function getOrSeedConfig(ctx: MutationCtx) {
  const existing = await ctx.db.query("sandboxConfig").first()
  if (existing) return existing
  const id = await ctx.db.insert("sandboxConfig", { basket: DEFAULT_BASKET, seedVersion: SEED_VERSION })
  return (await ctx.db.get(id))!
}

async function profileForWallet(ctx: QueryCtx | MutationCtx, wallet: string) {
  return ctx.db
    .query("sandboxProfiles")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet.toLowerCase()))
    .unique()
}

/** Wallet-scoped onboarding state for the SandboxGate (own wallet only). */
export const getState = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const profile = await profileForWallet(ctx, wallet)
    const economy = await ctx.db.query("sandboxEconomy").first()
    return {
      onboardingStep: profile?.onboardingStep ?? "wallet",
      profile,
      economy: economy
        ? {
            status: economy.status,
            userCount: economy.userCount,
            userCap: economy.userCap,
            perUserTargetUsd: economy.perUserTargetUsd,
          }
        : {
            status: "open" as const,
            userCount: 0,
            userCap: DEFAULT_ECONOMY.userCap,
            perUserTargetUsd: DEFAULT_ECONOMY.perUserTargetUsd,
          },
    }
  },
})

/** Step 2: derive the eligibility tier and move to "eligible". */
export const startAnalysis = mutation({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const economy = await getOrSeedEconomy(ctx)
    const authSubject = (await getAuthSubject(ctx)) ?? undefined
    const { tier, seed } = deriveTier(wallet, economy.minMultiplier, economy.maxMultiplier)

    const existing = await profileForWallet(ctx, wallet)
    if (existing) {
      if (existing.onboardingStep === "done" || existing.onboardingStep === "waitlisted") return existing.onboardingStep
      await ctx.db.patch(existing._id, { onboardingStep: "eligible", eligibilityTier: tier, tierSeed: seed })
      return "eligible" as const
    }

    await ctx.db.insert("sandboxProfiles", {
      wallet,
      authSubject,
      createdAt: Date.now(),
      seedVersion: SEED_VERSION,
      onboardingStep: "eligible",
      eligibilityTier: tier,
      tierSeed: seed,
    })
    return "eligible" as const
  },
})

/**
 * Optional X/tweet sub-flow (eligible → xPending). The user has signalled intent to
 * share; no tweet is recorded yet. Idempotent; never regresses a finished profile.
 */
export const startTweet = mutation({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const profile = await profileForWallet(ctx, wallet)
    if (!profile) throw new Error("NO_PROFILE: start onboarding before sharing.")
    if (profile.onboardingStep === "done" || profile.onboardingStep === "waitlisted") return profile.onboardingStep
    if (profile.onboardingStep === "xConfirmed") return "xConfirmed" as const
    await ctx.db.patch(profile._id, { onboardingStep: "xPending" })
    return "xPending" as const
  },
})

/**
 * Confirm the share (xPending|eligible → xConfirmed), recording handle + tweet URL.
 * This is a sandbox attestation — there is no server-side tweet verification.
 */
export const confirmTweet = mutation({
  args: { wallet: v.string(), xHandle: v.optional(v.string()), tweetUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const profile = await profileForWallet(ctx, wallet)
    if (!profile) throw new Error("NO_PROFILE: start onboarding before sharing.")
    if (profile.onboardingStep === "done" || profile.onboardingStep === "waitlisted") return profile.onboardingStep
    await ctx.db.patch(profile._id, {
      onboardingStep: "xConfirmed",
      xHandle: args.xHandle,
      tweetUrl: args.tweetUrl,
      tweetedAt: Date.now(),
    })
    return "xConfirmed" as const
  },
})

/** Final step: enforce caps server-side, allocate the basket, mark done — or waitlist. */
export const claim = mutation({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const economy = await getOrSeedEconomy(ctx)
    const config = await getOrSeedConfig(ctx)
    const profile = await profileForWallet(ctx, wallet)
    if (!profile) throw new Error("NO_PROFILE: start onboarding before claiming.")
    if (profile.onboardingStep === "done") return { status: "done" as const, allocatedUsd: profile.allocatedUsd ?? 0 }

    const tier = profile.eligibilityTier ?? economy.minMultiplier
    const allocatedUsd = economy.perUserTargetUsd * tier

    // Server-side caps — re-read live counts, never trust the client.
    const capReached =
      economy.status !== "open" ||
      economy.userCount >= economy.userCap ||
      economy.totalGrantedUsd + allocatedUsd > economy.totalGrantedUsdCap

    if (capReached) {
      await ctx.db.patch(profile._id, { onboardingStep: "waitlisted" })
      const justClosed = economy.status === "open" && economy.userCount >= economy.userCap
      if (justClosed) {
        await ctx.db.patch(economy._id, { status: "closed", closedReason: "userCap reached", closedAt: Date.now() })
      }
      return { status: "waitlisted" as const, allocatedUsd: 0 }
    }

    const now = Date.now()

    // Live-price basket: read the real DefiLlama-fed `tokenPrices` (the one place the
    // sandbox mirrors prod), falling back to the synthetic map for tokens not on a
    // live feed (e.g. aave/uni are not in TOKEN_LLAMA_IDS). Symbol == basket tokenId.
    const priceRows = await ctx.db.query("tokenPrices").collect()
    const livePrice: Record<string, number> = {}
    for (const row of priceRows) livePrice[row.symbol] = row.priceUsd
    const basketSnapshot = config.basket.map((slot) => {
      const priceUsdAtClaim = livePrice[slot.tokenId] ?? SANDBOX_TOKEN_PRICE_USD[slot.tokenId] ?? 1
      const amount = (allocatedUsd * slot.weight) / priceUsdAtClaim
      return { tokenId: slot.tokenId, amount, priceUsdAtClaim }
    })

    const syntheticTxHash = `sim-claim-${(profile.tierSeed ?? "0").slice(0, 8)}-${now.toString(36)}`

    await ctx.db.patch(profile._id, {
      onboardingStep: "done",
      onboardedAt: now,
      allocatedUsd,
      basketSnapshot,
      claimTxSynthetic: syntheticTxHash,
    })
    // Atomic with the profile write (same transaction).
    await ctx.db.patch(economy._id, {
      userCount: economy.userCount + 1,
      totalGrantedUsd: economy.totalGrantedUsd + allocatedUsd,
    })
    await ctx.db.insert("sandboxActivity", {
      wallet,
      kind: "onboardingClaim",
      amountUsd: allocatedUsd,
      syntheticTxHash,
      at: now,
    })

    // Seed wallet-scoped starter state so the dashboard reads real Convex rows the
    // moment onboarding completes: a starter LP supply position, the matching ledger
    // transaction, an initial portfolio snapshot, and the session marker.
    const allocatedUsd6 = Math.round(allocatedUsd * 1_000_000).toString()
    const starterPositionId = await ctx.db.insert("positions", {
      wallet,
      product: "lend",
      marketSlug: STARTER_LP_SLUG,
      status: "open",
      suppliedUsd6: allocatedUsd6,
      earnedUsd6: "0",
      openedAt: now,
      lastUpdatedAt: now,
      openTxSynthetic: syntheticTxHash,
    })
    await ctx.db.insert("transactions", {
      wallet,
      intentId: `onboarding-${syntheticTxHash}`,
      product: "lend",
      kind: "deposit",
      status: "success",
      marketSlug: STARTER_LP_SLUG,
      positionId: starterPositionId,
      requestedAmountUsd6: allocatedUsd6,
      executedAmountUsd6: allocatedUsd6,
      amountUsd: allocatedUsd,
      syntheticTxHash,
      simulated: true,
      at: now,
    })
    await ctx.db.insert("portfolioSnapshots", {
      wallet,
      at: now,
      totalValueUsd: allocatedUsd,
      totalSuppliedUsd: allocatedUsd,
      totalBorrowedUsd: 0,
      availableToBorrowUsd: allocatedUsd * 0.7,
      totalMultiplyExposureUsd: 0,
      totalEarnedUsd: 0,
    })
    await ctx.db.insert("sandboxSessions", {
      wallet,
      authSubject: profile.authSubject,
      seedVersion: SEED_VERSION,
      seededAt: now,
      lastSeenAt: now,
    })

    return { status: "done" as const, allocatedUsd, basketSnapshot, syntheticTxHash, starterPositionId }
  },
})
