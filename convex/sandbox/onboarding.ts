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
import { buildStarterAllocationPlan, STARTER_EQUITY_USD } from "./starterAllocation"

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

const DEFAULT_CONFIG = {
  basket: DEFAULT_BASKET,
  seedVersion: SEED_VERSION,
  tweetTemplate:
    "I'm practicing DeFi risk-free on the Avana sandbox — borrowing against LP, lending, and looping positions with $1M of synthetic funds.",
  xHandle: "AvanaFinance",
  resourcesLinks: [
    { label: "Read the docs", href: "/docs" },
    { label: "Explore markets", href: "/borrow" },
  ],
}

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
  const id = await ctx.db.insert("sandboxConfig", DEFAULT_CONFIG)
  return (await ctx.db.get(id))!
}

async function profileForWallet(ctx: QueryCtx | MutationCtx, wallet: string) {
  return ctx.db
    .query("sandboxProfiles")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet.toLowerCase()))
    .unique()
}

async function applyMarketDelta(
  ctx: MutationCtx,
  marketSlug: string,
  suppliedDeltaUsd: number,
  borrowedDeltaUsd: number,
  now: number,
) {
  const existing = await ctx.db
    .query("marketLiquidityDeltas")
    .withIndex("by_slug", (queryBuilder) => queryBuilder.eq("marketSlug", marketSlug))
    .unique()
  if (existing) {
    await ctx.db.patch(existing._id, {
      suppliedDeltaUsd: existing.suppliedDeltaUsd + suppliedDeltaUsd,
      borrowedDeltaUsd: existing.borrowedDeltaUsd + borrowedDeltaUsd,
      updatedAt: now,
    })
    return
  }
  await ctx.db.insert("marketLiquidityDeltas", {
    marketSlug,
    suppliedDeltaUsd,
    borrowedDeltaUsd,
    updatedAt: now,
  })
}

/** Wallet-scoped onboarding state for the SandboxGate (own wallet only). */
export const getState = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const profile = await profileForWallet(ctx, wallet)
    const [economy, config] = await Promise.all([
      ctx.db.query("sandboxEconomy").first(),
      ctx.db.query("sandboxConfig").first(),
    ])
    return {
      onboardingStep: profile?.onboardingStep ?? "wallet",
      profile,
      config: config
        ? {
            basket: config.basket,
            tweetTemplate: config.tweetTemplate ?? DEFAULT_CONFIG.tweetTemplate,
            xHandle: config.xHandle ?? DEFAULT_CONFIG.xHandle,
            resourcesLinks: config.resourcesLinks ?? DEFAULT_CONFIG.resourcesLinks,
          }
        : DEFAULT_CONFIG,
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

/** Persist the analysis loading state before the deterministic eligibility pass. */
export const beginAnalysis = mutation({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const authSubject = (await getAuthSubject(ctx)) ?? undefined
    const existing = await profileForWallet(ctx, wallet)
    if (existing) {
      if (existing.onboardingStep === "done" || existing.onboardingStep === "waitlisted") return existing.onboardingStep
      await ctx.db.patch(existing._id, { onboardingStep: "analyzing" })
      return "analyzing" as const
    }
    await ctx.db.insert("sandboxProfiles", {
      wallet,
      authSubject,
      createdAt: Date.now(),
      seedVersion: SEED_VERSION,
      onboardingStep: "analyzing",
    })
    return "analyzing" as const
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

/** Continue without sharing; participation never changes the $1M allocation. */
export const skipTweet = mutation({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const profile = await profileForWallet(ctx, wallet)
    if (!profile) throw new Error("NO_PROFILE: start onboarding before continuing.")
    if (profile.onboardingStep === "done" || profile.onboardingStep === "waitlisted") return profile.onboardingStep
    await ctx.db.patch(profile._id, { onboardingStep: "xConfirmed" })
    return "xConfirmed" as const
  },
})

/** Persist the claim loading state before the atomic allocation mutation runs. */
export const beginClaim = mutation({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const profile = await profileForWallet(ctx, wallet)
    if (!profile) throw new Error("NO_PROFILE: start onboarding before claiming.")
    if (profile.onboardingStep === "done" || profile.onboardingStep === "waitlisted") return profile.onboardingStep
    await ctx.db.patch(profile._id, { onboardingStep: "claimPending" })
    return "claimPending" as const
  },
})

/** Final step: enforce caps server-side, allocate the basket, mark done — or waitlist. */
export const claim = mutation({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const economy = await getOrSeedEconomy(ctx)
    await getOrSeedConfig(ctx)
    const profile = await profileForWallet(ctx, wallet)
    if (!profile) throw new Error("NO_PROFILE: start onboarding before claiming.")
    if (profile.onboardingStep === "done") return { status: "done" as const, allocatedUsd: profile.allocatedUsd ?? 0 }

    const allocatedUsd = STARTER_EQUITY_USD

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

    const [priceRows, markets] = await Promise.all([
      ctx.db.query("tokenPrices").collect(),
      ctx.db.query("markets").collect(),
    ])
    const allocation = buildStarterAllocationPlan(
      wallet,
      markets.map((market) => ({ slug: market.slug, scope: market.scope })),
    )
    const marketBySlug = new Map(markets.map((market) => [market.slug, market]))
    const livePrice: Record<string, number> = {}
    for (const row of priceRows) livePrice[row.symbol] = row.priceUsd
    const basketSnapshot = allocation.liquid.map((leg) => {
      const market = marketBySlug.get(leg.marketSlug)
      const symbol = market?.symbol.toLowerCase() ?? leg.marketSlug
      const priceUsdAtClaim = livePrice[symbol] ?? SANDBOX_TOKEN_PRICE_USD[symbol] ?? 1
      return { tokenId: leg.marketSlug, amount: leg.amountUsd / priceUsdAtClaim, priceUsdAtClaim }
    })

    const syntheticTxHash = `sim-claim-${(profile.tierSeed ?? "0").slice(0, 8)}-${now.toString(36)}`
    const receiptHashes: string[] = []

    for (const [index, leg] of allocation.liquid.entries()) {
      const market = marketBySlug.get(leg.marketSlug)
      // Skip a missing asset rather than failing the whole claim (the plan only ever
      // references seeded slugs, so this is just belt-and-suspenders against seed drift).
      if (!market) continue
      const symbol = market.symbol.toLowerCase()
      const priceUsd = livePrice[symbol] ?? SANDBOX_TOKEN_PRICE_USD[symbol] ?? 1
      await ctx.db.insert("sandboxBalances", {
        wallet,
        assetSlug: leg.marketSlug,
        symbol: market.symbol,
        amount: leg.amountUsd / priceUsd,
        valueUsd: leg.amountUsd,
        priceUsd,
        updatedAt: now,
      })
      const hash = `${syntheticTxHash}-asset-${index}`
      receiptHashes.push(hash)
      await ctx.db.insert("sandboxActivity", {
        wallet,
        kind: "starterAssetGrant",
        amountUsd: leg.amountUsd,
        marketSlug: leg.marketSlug,
        syntheticTxHash: hash,
        at: now,
      })
    }

    for (const [index, leg] of allocation.collateral.entries()) {
      const amountUsd6 = Math.round(leg.amountUsd * 1_000_000).toString()
      const hash = `${syntheticTxHash}-pool-${index}`
      receiptHashes.push(hash)
      const positionId = await ctx.db.insert("positions", {
        wallet,
        product: "borrow",
        marketSlug: leg.marketSlug,
        status: "open",
        collateralValueUsd6: amountUsd6,
        debtValueUsd6: "0",
        openedAt: now,
        lastUpdatedAt: now,
        openTxSynthetic: hash,
      })
      // Store the intended USD in collateralValueUsd6 and leave shares at 0: the client
      // hydration derives real LP-token shares from this USD using the LIVE market price.
      // The seed can't compute shares here because Convex has no access to the client's
      // catalog LP prices, and storing the raw USD as shares made the engine read ~$0.
      await ctx.db.insert("positionCollateral", {
        wallet,
        positionId,
        marketSlug: leg.marketSlug,
        collateralShares: "0",
        principalTokenAmount: "0",
        collateralEnabled: true,
        collateralValueUsd6: amountUsd6,
        updatedAt: now,
      })
      await ctx.db.insert("transactions", {
        wallet,
        intentId: `onboarding-pool-${leg.marketSlug}`,
        product: "borrow",
        kind: "deposit",
        status: "success",
        marketSlug: leg.marketSlug,
        positionId,
        requestedAmountUsd6: amountUsd6,
        executedAmountUsd6: amountUsd6,
        amountUsd: leg.amountUsd,
        syntheticTxHash: hash,
        simulated: true,
        at: now,
      })
      await applyMarketDelta(ctx, leg.marketSlug, leg.amountUsd, 0, now)
    }

    for (const [index, leg] of allocation.lend.entries()) {
      const amountUsd6 = Math.round(leg.amountUsd * 1_000_000).toString()
      const hash = `${syntheticTxHash}-lend-${index}`
      receiptHashes.push(hash)
      const positionId = await ctx.db.insert("positions", {
        wallet,
        product: "lend",
        marketSlug: leg.marketSlug,
        status: "open",
        suppliedUsd6: amountUsd6,
        earnedUsd6: "0",
        openedAt: now,
        lastUpdatedAt: now,
        openTxSynthetic: hash,
      })
      await ctx.db.insert("transactions", {
        wallet,
        intentId: `onboarding-lend-${leg.marketSlug}`,
        product: "lend",
        kind: "deposit",
        status: "success",
        marketSlug: leg.marketSlug,
        positionId,
        requestedAmountUsd6: amountUsd6,
        executedAmountUsd6: amountUsd6,
        amountUsd: leg.amountUsd,
        syntheticTxHash: hash,
        simulated: true,
        at: now,
      })
      await applyMarketDelta(ctx, leg.marketSlug, leg.amountUsd, 0, now)
    }

    for (const [index, leg] of allocation.multiply.entries()) {
      const multiplier = 2
      const grossExposureUsd = leg.amountUsd * multiplier
      const debtValueUsd = grossExposureUsd - leg.amountUsd
      const amountUsd6 = Math.round(leg.amountUsd * 1_000_000).toString()
      const hash = `${syntheticTxHash}-multiply-${index}`
      receiptHashes.push(hash)
      const positionId = await ctx.db.insert("positions", {
        wallet,
        product: "multiply",
        marketSlug: leg.marketSlug,
        status: "open",
        collateralAmount: leg.amountUsd,
        collateralValueUsd: grossExposureUsd,
        debtValueUsd,
        multiplier,
        ltv: debtValueUsd / grossExposureUsd,
        healthFactor: 2,
        liquidationPrice: null,
        netApyPct: 0,
        openedAt: now,
        lastUpdatedAt: now,
        openTxSynthetic: hash,
      })
      await ctx.db.insert("transactions", {
        wallet,
        intentId: `onboarding-multiply-${leg.marketSlug}`,
        product: "multiply",
        kind: "multiply",
        status: "success",
        marketSlug: leg.marketSlug,
        positionId,
        requestedAmountUsd6: amountUsd6,
        executedAmountUsd6: amountUsd6,
        amountUsd: leg.amountUsd,
        syntheticTxHash: hash,
        simulated: true,
        at: now,
      })
      await applyMarketDelta(ctx, leg.marketSlug, grossExposureUsd, debtValueUsd, now)
    }

    await ctx.db.insert("starterAllocations", {
      wallet,
      version: allocation.version,
      totalEquityUsd: allocation.totalEquityUsd,
      liquid: allocation.liquid,
      collateral: allocation.collateral,
      lend: allocation.lend,
      multiply: allocation.multiply,
      receiptHashes,
      createdAt: now,
    })
    const liquidValueUsd = allocation.liquid.reduce((sum, leg) => sum + leg.amountUsd, 0)
    const collateralValueUsd = allocation.collateral.reduce((sum, leg) => sum + leg.amountUsd, 0)
    const lendValueUsd = allocation.lend.reduce((sum, leg) => sum + leg.amountUsd, 0)
    const multiplyEquityUsd = allocation.multiply.reduce((sum, leg) => sum + leg.amountUsd, 0)
    const multiplyExposureUsd = multiplyEquityUsd * 2
    const multiplyDebtUsd = multiplyExposureUsd - multiplyEquityUsd
    await ctx.db.insert("portfolioSnapshots", {
      wallet,
      at: now,
      totalValueUsd:
        liquidValueUsd + collateralValueUsd + lendValueUsd + multiplyExposureUsd - multiplyDebtUsd,
      totalSuppliedUsd: collateralValueUsd + lendValueUsd + multiplyExposureUsd,
      totalBorrowedUsd: multiplyDebtUsd,
      availableToBorrowUsd: collateralValueUsd * 0.7,
      totalMultiplyExposureUsd: multiplyExposureUsd,
      totalEarnedUsd: 0,
    })
    await ctx.db.insert("sandboxSessions", {
      wallet,
      authSubject: profile.authSubject,
      seedVersion: SEED_VERSION,
      seededAt: now,
      lastSeenAt: now,
    })

    await ctx.db.patch(profile._id, {
      onboardingStep: "done",
      onboardedAt: now,
      allocatedUsd,
      basketSnapshot,
      claimTxSynthetic: syntheticTxHash,
    })
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

    return { status: "done" as const, allocatedUsd, basketSnapshot, syntheticTxHash, allocation, receiptHashes }
  },
})
