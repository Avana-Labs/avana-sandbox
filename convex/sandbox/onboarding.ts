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
import { upsertWalletBalanceRows } from "../wallet/balances"
import { replaceProductBalanceRows } from "../wallet/productBalances"
import { requireSandboxWallet, getAuthSubject } from "./auth"
import { assertCatalogCanSatisfyStarter, buildStarterAllocationPlan, STARTER_EQUITY_USD } from "./starterAllocation"

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

const UMBRELLA_ONBOARDING_POSITIONS = [
  { marketSlug: "usdc", symbol: "USDC", suppliedUsd: 8000, earnedUsd: 18.25, cooldownUsd: 0, cooldownOffsetMs: null },
  { marketSlug: "weth", symbol: "WETH", suppliedUsd: 6720, earnedUsd: 9.1, cooldownUsd: 0, cooldownOffsetMs: null },
  {
    marketSlug: "gho",
    symbol: "GHO",
    suppliedUsd: 5000,
    earnedUsd: 11.4,
    cooldownUsd: 2500,
    cooldownOffsetMs: 11 * 24 * 60 * 60 * 1000,
  },
] as const

const UMBRELLA_ONBOARDING_BALANCES = [
  { assetSlug: "usdc", symbol: "USDC", amount: 25_000, priceUsd: 1 },
  { assetSlug: "usdt", symbol: "USDT", amount: 15_000, priceUsd: 1 },
  { assetSlug: "gho", symbol: "GHO", amount: 20_000, priceUsd: 1 },
  { assetSlug: "weth", symbol: "WETH", amount: 5, priceUsd: 1934 },
] as const

/** Shard count for the economy counters — spreads concurrent claim increments so no
 *  two claims collide on the same row under OCC. */
const ECONOMY_SHARDS = 16

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

// Sandbox fallback prices, keyed by lowercase token symbol. The live oracle (`tokenPrices`,
// refreshed hourly from DefiLlama) is preferred at runtime; this is the cold-cache safety net so
// onboarding NEVER depends on the price cron having run. It must cover every token the starter
// buckets can select whose price isn't seeded on the market row — i.e. all ASSET-market base
// tokens (pool/lend/multiply carry their own `markets.priceUsd`). Values mirror the app's static
// catalog prices. These MUST mirror the single client baseline in
// app/lib/prices/sandbox-baseline-prices.ts (Convex can't import app/ modules, so keep
// them in sync by hand). Without full coverage here, a fresh deployment (empty
// `tokenPrices`) resolves those asset legs to $0 and the claim gate rejects every wallet.
export const SANDBOX_TOKEN_PRICE_USD: Record<string, number> = {
  usdc: 1,
  usdt: 1,
  dai: 1,
  gho: 1,
  crvusd: 1,
  eurc: 1.08,
  eth: 1934,
  weth: 1934,
  steth: 1930,
  wsteth: 2100,
  reth: 2045,
  cbeth: 1990,
  wbtc: 65_000,
  cbbtc: 65_000,
  aave: 105,
  uni: 12,
  crv: 0.5,
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
  // Collapse any duplicate singleton a concurrent cold-start inserted at the same time,
  // so `.first()` (and the caps read below) stay against exactly one authoritative row.
  const rows = await ctx.db.query("sandboxEconomy").collect()
  for (const row of rows) if (row._id !== id) await ctx.db.delete(row._id)
  return (await ctx.db.get(id))!
}

async function getOrSeedConfig(ctx: MutationCtx) {
  const existing = await ctx.db.query("sandboxConfig").first()
  if (existing) return existing
  const id = await ctx.db.insert("sandboxConfig", DEFAULT_CONFIG)
  const rows = await ctx.db.query("sandboxConfig").collect()
  for (const row of rows) if (row._id !== id) await ctx.db.delete(row._id)
  return (await ctx.db.get(id))!
}

async function upsertSandboxBalance(
  ctx: MutationCtx,
  row: { wallet: string; assetSlug: string; symbol: string; amount: number; priceUsd: number; updatedAt: number },
) {
  const existing = await ctx.db
    .query("sandboxBalances")
    .withIndex("by_wallet_asset", (q) => q.eq("wallet", row.wallet).eq("assetSlug", row.assetSlug))
    .unique()
  const valueUsd = row.amount * row.priceUsd
  if (existing) {
    await ctx.db.patch(existing._id, { amount: Math.max(existing.amount, row.amount), valueUsd, priceUsd: row.priceUsd, updatedAt: row.updatedAt })
  } else {
    await ctx.db.insert("sandboxBalances", { ...row, valueUsd })
  }
  await upsertWalletBalanceRows(ctx, [
    {
      wallet: row.wallet,
      assetId: row.assetSlug,
      amount: existing ? Math.max(existing.amount, row.amount) : row.amount,
      sourceType: "wallet",
      assetKind: "wallet",
      symbol: row.symbol,
      valueUsd6: String(Math.round((existing ? Math.max(existing.amount, row.amount) : row.amount) * row.priceUsd * 1_000_000)),
    },
  ])
}

async function getOrSeedStarterCatalog(ctx: MutationCtx) {
  const existing = await ctx.db
    .query("sandboxStarterCatalog")
    .withIndex("by_singleton", (q) => q.eq("singleton", "starter"))
    .first()

  // Steady-state fast path: a fully-priced catalog is a fixed grant manifest, so once it is
  // populated every claim just READS it — no per-claim full tokenPrices+markets scan and no
  // write to the shared singleton (which serialized concurrent claims and was the onboarding-
  // burst hotspot). Only (re)build below when the catalog is missing or still partial from a
  // cold-start seed (any unpriced row), preserving the late-seed recovery. (#13/S1)
  if (existing && existing.rows.length > 0 && existing.rows.every((row) => row.priceUsd > 0)) {
    return existing.rows
  }

  const [priceRows, markets] = await Promise.all([
    ctx.db.query("tokenPrices").collect(),
    ctx.db.query("markets").collect(),
  ])
  const livePrice = new Map(priceRows.map((row) => [row.symbol, row.priceUsd]))
  const rows = markets.map((market) => {
    const symbol = market.symbol.toLowerCase()
    return {
      slug: market.slug,
      scope: market.scope,
      symbol: market.symbol,
      // Live oracle first (fresh bluechip prices), then the small static fallback, then the
      // market's own seeded price. pool markets carry LP-pair symbols ("cbBTC/USDC") and
      // long-tail lend markets carry chain-name symbols ("OP") that are NOT single-token
      // oracle keys — without `markets.priceUsd` they resolve to 0 and the fail-closed claim
      // gate (assertCatalogCanSatisfyStarter) rejects EVERY wallet. build-seed seeds priceUsd
      // per scope (pool = USD-denominated 1; lend/multiply = their asset price).
      priceUsd: livePrice.get(symbol) ?? SANDBOX_TOKEN_PRICE_USD[symbol] ?? market.priceUsd ?? 0,
    }
  })

  // The market seed can land after the first onboarding attempt. Never keep the
  // cold-start catalog forever: refresh the singleton from the canonical market tables
  // so a previously empty/partial deployment becomes claimable after it is seeded.
  if (existing) {
    await ctx.db.patch(existing._id, { rows, updatedAt: Date.now() })
    return rows
  }

  const id = await ctx.db.insert("sandboxStarterCatalog", {
    singleton: "starter",
    rows,
    updatedAt: Date.now(),
  })
  const duplicates = await ctx.db
    .query("sandboxStarterCatalog")
    .withIndex("by_singleton", (q) => q.eq("singleton", "starter"))
    .collect()
  for (const duplicate of duplicates) if (duplicate._id !== id) await ctx.db.delete(duplicate._id)
  return rows
}

/** Live economy counts = baseline on the singleton row + the sum of every shard. */
async function readEconomyCounts(ctx: MutationCtx | QueryCtx, economy: { userCount: number; totalGrantedUsd: number }) {
  const shards = await ctx.db.query("sandboxEconomyShards").collect()
  let userCount = economy.userCount
  let totalGrantedUsd = economy.totalGrantedUsd
  for (const shard of shards) {
    userCount += shard.userCount
    totalGrantedUsd += shard.grantedUsd
  }
  return { userCount, totalGrantedUsd }
}

/** Add one claim's grant to a random shard (never the hot singleton row), so
 *  concurrent claims write disjoint documents and don't contend under OCC. */
async function incrementEconomyShard(ctx: MutationCtx, grantedUsd: number) {
  const shard = Math.floor(Math.random() * ECONOMY_SHARDS)
  const existing = await ctx.db
    .query("sandboxEconomyShards")
    .withIndex("by_shard", (q) => q.eq("shard", shard))
    .first()
  if (existing) {
    await ctx.db.patch(existing._id, {
      userCount: existing.userCount + 1,
      grantedUsd: existing.grantedUsd + grantedUsd,
    })
    return
  }
  await ctx.db.insert("sandboxEconomyShards", { shard, userCount: 1, grantedUsd })
}

async function profileForWallet(ctx: QueryCtx | MutationCtx, wallet: string) {
  return ctx.db
    .query("sandboxProfiles")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet.toLowerCase()))
    .unique()
}

function liquidAssetIdForMultiplyDebt(marketSlug: string) {
  const parts = marketSlug.toLowerCase().split(/[-_:]/)
  return parts.find((part) => part === "usdc" || part === "usdt" || part === "dai" || part === "gho") ?? "usdc"
}

/** Wallet-scoped onboarding state for the SandboxGate (own wallet only). */
export const getState = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const profile = await profileForWallet(ctx, wallet)
    const [economy, config, shards] = await Promise.all([
      ctx.db.query("sandboxEconomy").first(),
      ctx.db.query("sandboxConfig").first(),
      ctx.db.query("sandboxEconomyShards").collect(),
    ])
    const shardedUserCount = shards.reduce((sum, shard) => sum + shard.userCount, 0)
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
            userCount: economy.userCount + shardedUserCount,
            userCap: economy.userCap,
            perUserTargetUsd: economy.perUserTargetUsd,
          }
        : {
            status: "open" as const,
            userCount: shardedUserCount,
            userCap: DEFAULT_ECONOMY.userCap,
            perUserTargetUsd: DEFAULT_ECONOMY.perUserTargetUsd,
          },
    }
  },
})

/**
 * Wallet-only onboarding state — the STEADY-STATE gate subscription.
 *
 * Unlike `getState`, this deliberately does NOT read `sandboxEconomyShards`, so a signed-in
 * wallet does not subscribe to the global economy counters. That subscription was the main
 * 10k-concurrency hazard: every `claim` writes a shard, which invalidated every authed
 * wallet's `getState` subscription and forced a re-run. Post-onboarding the gate only needs
 * this wallet's own profile/step, which changes only when THIS wallet acts.
 */
export const getWalletOnboardingState = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const [profile, config] = await Promise.all([profileForWallet(ctx, wallet), ctx.db.query("sandboxConfig").first()])
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
    }
  },
})

/**
 * Global economy status (seats left / open|closed) — reads the sharded counters, so it is
 * invalidated by every claim. Subscribe to this ONLY while onboarding is actually in progress
 * (the waitlist/claim UI), never for every authed user forever. `wallet` is required purely to
 * authenticate the caller; the result is global.
 */
export const getEconomyStatus = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    await requireSandboxWallet(ctx, args.wallet)
    const [economy, shards] = await Promise.all([
      ctx.db.query("sandboxEconomy").first(),
      ctx.db.query("sandboxEconomyShards").collect(),
    ])
    const shardedUserCount = shards.reduce((sum, shard) => sum + shard.userCount, 0)
    return economy
      ? {
          status: economy.status,
          userCount: economy.userCount + shardedUserCount,
          userCap: economy.userCap,
          perUserTargetUsd: economy.perUserTargetUsd,
        }
      : {
          status: "open" as const,
          userCount: shardedUserCount,
          userCap: DEFAULT_ECONOMY.userCap,
          perUserTargetUsd: DEFAULT_ECONOMY.perUserTargetUsd,
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

    // Server-side caps — re-read live counts (summed across shards), never trust the client.
    const counts = await readEconomyCounts(ctx, economy)
    const capReached =
      economy.status !== "open" ||
      counts.userCount >= economy.userCap ||
      counts.totalGrantedUsd + allocatedUsd > economy.totalGrantedUsdCap

    if (capReached) {
      await ctx.db.patch(profile._id, { onboardingStep: "waitlisted" })
      const justClosed = economy.status === "open" && counts.userCount >= economy.userCap
      if (justClosed) {
        await ctx.db.patch(economy._id, { status: "closed", closedReason: "userCap reached", closedAt: Date.now() })
      }
      return { status: "waitlisted" as const, allocatedUsd: 0 }
    }

    const now = Date.now()

    const starterCatalog = await getOrSeedStarterCatalog(ctx)
    const marketBySlug = new Map(starterCatalog.map((market) => [market.slug, market]))
    const catalogBySlug = new Map(starterCatalog.map((market) => [market.slug, market]))

    // Fail closed on an incomplete catalog: never mark a wallet "done" with a partial or
    // empty starter portfolio (that permanently locks it out of a real $1M allocation).
    // We resolve each market's price the SAME way the seed does — live oracle first, then
    // the known sandbox fallback — but WITHOUT the blanket `?? 1` used below, so a market
    // whose price truly cannot be resolved is treated as incomplete rather than seeded at
    // $1/token. Throws ONBOARDING_CATALOG_INCOMPLETE; the claim aborts before any write and
    // the profile stays on its current (non-"done") step, so the wallet can retry once seeded.
    assertCatalogCanSatisfyStarter(wallet, starterCatalog)

    const allocation = buildStarterAllocationPlan(wallet, starterCatalog)
    const basketSnapshot = allocation.liquid.map((leg) => {
      const market = marketBySlug.get(leg.marketSlug)
      const symbol = market?.symbol.toLowerCase() ?? leg.marketSlug
      const priceUsdAtClaim = catalogBySlug.get(leg.marketSlug)?.priceUsd ?? SANDBOX_TOKEN_PRICE_USD[symbol] ?? 1
      return { tokenId: leg.marketSlug, amount: leg.amountUsd / priceUsdAtClaim, priceUsdAtClaim }
    })

    const syntheticTxHash = `sim-claim-${(profile.tierSeed ?? "0").slice(0, 8)}-${now.toString(36)}`
    const receiptHashes: string[] = []

    const productLiquidRows: Parameters<typeof replaceProductBalanceRows>[2]["liquid"] = []
    const productLendRows: Parameters<typeof replaceProductBalanceRows>[2]["lend"] = []
    const productBorrowRows: Parameters<typeof replaceProductBalanceRows>[2]["borrow"] = []
    const productMultiplyRows: Parameters<typeof replaceProductBalanceRows>[2]["multiply"] = []

    for (const [index, leg] of allocation.liquid.entries()) {
      const market = marketBySlug.get(leg.marketSlug)
      // Skip a missing asset rather than failing the whole claim (the plan only ever
      // references seeded slugs, so this is just belt-and-suspenders against seed drift).
      if (!market) continue
      const symbol = market.symbol.toLowerCase()
      const priceUsd = catalogBySlug.get(leg.marketSlug)?.priceUsd ?? SANDBOX_TOKEN_PRICE_USD[symbol] ?? 1
      const amount = leg.amountUsd / priceUsd
      productLiquidRows.push({
        assetId: leg.marketSlug,
        symbol: market.symbol,
        amount,
        valueUsd: leg.amountUsd,
        state: "available",
      })
      await ctx.db.insert("sandboxBalances", {
        wallet,
        assetSlug: leg.marketSlug,
        symbol: market.symbol,
        amount,
        valueUsd: leg.amountUsd,
        priceUsd,
        updatedAt: now,
      })
      await upsertWalletBalanceRows(ctx, [
        {
          wallet,
          assetId: leg.marketSlug,
          amount,
          sourceType: "wallet",
          assetKind: "wallet",
          symbol: market.symbol,
          valueUsd6: String(Math.round(leg.amountUsd * 1_000_000)),
        },
      ])
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
      const market = marketBySlug.get(leg.marketSlug)
      const priceUsd = catalogBySlug.get(leg.marketSlug)?.priceUsd ?? market?.priceUsd ?? 1
      productBorrowRows.push({
        marketId: leg.marketSlug,
        poolId: leg.marketSlug,
        symbol: market?.symbol ?? leg.marketSlug.toUpperCase(),
        amount: priceUsd > 0 ? leg.amountUsd / priceUsd : leg.amountUsd,
        valueUsd: leg.amountUsd,
        state: "collateral",
      })
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
    }

    for (const [index, leg] of allocation.lend.entries()) {
      const amountUsd6 = Math.round(leg.amountUsd * 1_000_000).toString()
      const hash = `${syntheticTxHash}-lend-${index}`
      const market = marketBySlug.get(leg.marketSlug)
      const priceUsd = catalogBySlug.get(leg.marketSlug)?.priceUsd ?? market?.priceUsd ?? 1
      productLendRows.push({
        marketId: leg.marketSlug,
        assetId: leg.marketSlug,
        symbol: market?.symbol ?? leg.marketSlug.toUpperCase(),
        amount: priceUsd > 0 ? leg.amountUsd / priceUsd : leg.amountUsd,
        valueUsd: leg.amountUsd,
        state: "deposited",
      })
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
    }

    for (const [index, leg] of allocation.multiply.entries()) {
      const multiplier = 2
      const grossExposureUsd = leg.amountUsd * multiplier
      const debtValueUsd = grossExposureUsd - leg.amountUsd
      const amountUsd6 = Math.round(leg.amountUsd * 1_000_000).toString()
      const hash = `${syntheticTxHash}-multiply-${index}`
      receiptHashes.push(hash)
      // `collateralAmount` is a TOKEN QUANTITY, not USD: the multiply engine values a
      // position as `collateralValueUsd = collateralAmount * collateralPriceUsd` and
      // derives the liquidation price from it (app/lib/multiply-engine/simulation.ts,
      // actions.ts). For a multiply market the catalog stores the COLLATERAL asset's
      // symbol as `markets.symbol` (build-seed.ts), so its live price resolves exactly
      // like the liquid legs above. Storing USD here made the engine read a bogus
      // ~$2/token price and a garbage liquidation level. The stored quantity is the GROSS
      // (leveraged) collateral so `collateralValueUsd (gross) ≈ collateralAmount * price`.
      const multiplyMarket = marketBySlug.get(leg.marketSlug)
      const multiplySymbol = multiplyMarket?.symbol.toLowerCase() ?? leg.marketSlug
      const collateralPriceUsd =
        catalogBySlug.get(leg.marketSlug)?.priceUsd ?? SANDBOX_TOKEN_PRICE_USD[multiplySymbol] ?? 1
      const collateralAmount = grossExposureUsd / collateralPriceUsd
      productMultiplyRows.push(
        {
          marketId: leg.marketSlug,
          assetId: multiplySymbol,
          symbol: multiplyMarket?.symbol ?? multiplySymbol.toUpperCase(),
          amount: collateralAmount,
          valueUsd: grossExposureUsd,
          state: "position",
        },
        {
          marketId: leg.marketSlug,
          assetId: multiplySymbol,
          symbol: multiplyMarket?.symbol ?? multiplySymbol.toUpperCase(),
          amount: collateralAmount,
          valueUsd: grossExposureUsd,
          state: "collateral",
        },
        {
          marketId: leg.marketSlug,
          assetId: liquidAssetIdForMultiplyDebt(leg.marketSlug),
          symbol: liquidAssetIdForMultiplyDebt(leg.marketSlug).toUpperCase(),
          amount: debtValueUsd,
          valueUsd: debtValueUsd,
          state: "debt",
        },
      )
      const positionId = await ctx.db.insert("positions", {
        wallet,
        product: "multiply",
        marketSlug: leg.marketSlug,
        status: "open",
        collateralAmount,
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
    }

    const existingUmbrella = await ctx.db
      .query("positions")
      .withIndex("by_wallet_product", (q) => q.eq("wallet", wallet).eq("product", "umbrella"))
      .collect()
    if (existingUmbrella.length === 0) {
      for (const balance of UMBRELLA_ONBOARDING_BALANCES) {
        await upsertSandboxBalance(ctx, { wallet, ...balance, updatedAt: now })
      }
      for (const [index, position] of UMBRELLA_ONBOARDING_POSITIONS.entries()) {
        const suppliedUsd6 = Math.round(position.suppliedUsd * 1_000_000).toString()
        const earnedUsd6 = Math.round(position.earnedUsd * 1_000_000).toString()
        const cooldownAmountUsd6 = Math.round(position.cooldownUsd * 1_000_000).toString()
        const cooldownStartedAt = position.cooldownOffsetMs == null ? undefined : now - position.cooldownOffsetMs
        const cooldownEndsAt = position.cooldownOffsetMs == null ? undefined : cooldownStartedAt! + 20 * 24 * 60 * 60 * 1000
        const withdrawalWindowEndsAt =
          position.cooldownOffsetMs == null ? undefined : cooldownEndsAt! + 2 * 24 * 60 * 60 * 1000
        const hash = `${syntheticTxHash}-umbrella-${index}`
        receiptHashes.push(hash)
        const positionId = await ctx.db.insert("positions", {
          wallet,
          product: "umbrella",
          marketSlug: position.marketSlug,
          assetId: position.marketSlug,
          status: "open",
          suppliedUsd6,
          earnedUsd6,
          supplyApyPct: position.marketSlug === "usdc" ? 4.84 : position.marketSlug === "weth" ? 5.05 : 6.4,
          cooldownAmountUsd6,
          cooldownStartedAt,
          cooldownEndsAt,
          withdrawalWindowEndsAt,
          claimedRewardsUsd6: "0",
          openedAt: now,
          lastUpdatedAt: now,
          openTxSynthetic: hash,
          revision: 1,
        })
        await ctx.db.insert("transactions", {
          wallet,
          intentId: `onboarding-umbrella-${position.marketSlug}`,
          product: "umbrella",
          kind: "stake",
          status: "success",
          marketSlug: position.marketSlug,
          assetId: position.marketSlug,
          positionId,
          requestedAmountUsd6: suppliedUsd6,
          executedAmountUsd6: suppliedUsd6,
          amountUsd: position.suppliedUsd,
          syntheticTxHash: hash,
          simulated: true,
          at: now,
        })
      }
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
    await replaceProductBalanceRows(ctx, wallet, {
      liquid: productLiquidRows,
      lend: productLendRows,
      borrow: productBorrowRows,
      multiply: productMultiplyRows,
    })
    const liquidValueUsd = allocation.liquid.reduce((sum, leg) => sum + leg.amountUsd, 0)
    const collateralValueUsd = allocation.collateral.reduce((sum, leg) => sum + leg.amountUsd, 0)
    const lendValueUsd = allocation.lend.reduce((sum, leg) => sum + leg.amountUsd, 0)
    const multiplyEquityUsd = allocation.multiply.reduce((sum, leg) => sum + leg.amountUsd, 0)
    const multiplyExposureUsd = multiplyEquityUsd * 2
    const multiplyDebtUsd = multiplyExposureUsd - multiplyEquityUsd
    const collateralPools = await Promise.all(
      allocation.collateral.map((leg) =>
        ctx.db
          .query("pools")
          .withIndex("by_slug", (q) => q.eq("slug", leg.marketSlug))
          .unique(),
      ),
    )
    const availableToBorrowUsd = allocation.collateral.reduce((sum, leg, index) => {
      const cfPct = collateralPools[index]?.maxLtvPct ?? 70
      return sum + leg.amountUsd * (cfPct / 100)
    }, 0)
    const initialPortfolio = {
      wallet,
      at: now,
      totalValueUsd: liquidValueUsd + collateralValueUsd + lendValueUsd + multiplyExposureUsd - multiplyDebtUsd,
      totalSuppliedUsd: collateralValueUsd + lendValueUsd + multiplyExposureUsd,
      totalBorrowedUsd: multiplyDebtUsd,
      availableToBorrowUsd,
      totalMultiplyExposureUsd: multiplyExposureUsd,
      totalEarnedUsd: 0,
    }
    await ctx.db.insert("portfolioSnapshots", initialPortfolio)
    await ctx.db.insert("portfolioCurrent", initialPortfolio)
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
    // Increment a random shard instead of the hot singleton row so concurrent
    // claims write disjoint documents (no OCC contention on the counter).
    await incrementEconomyShard(ctx, allocatedUsd)
    if (
      counts.userCount + 1 >= economy.userCap ||
      counts.totalGrantedUsd + allocatedUsd >= economy.totalGrantedUsdCap
    ) {
      await ctx.db.patch(economy._id, {
        status: "closed",
        closedReason: counts.userCount + 1 >= economy.userCap ? "userCap reached" : "totalGrantedUsdCap reached",
        closedAt: now,
      })
    }
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

/** Persist wallet-scoped display preferences for signed-in users. */
export const savePreferences = mutation({
  args: {
    wallet: v.string(),
    preferences: v.object({
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
      language: v.optional(v.string()),
      currency: v.optional(v.string()),
      showDollarAmounts: v.optional(v.boolean()),
      name: v.optional(v.string()),
      dexSources: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const authSubject = (await getAuthSubject(ctx)) ?? undefined
    const existing = await profileForWallet(ctx, wallet)

    // Sanitize the new user-supplied fields server-side so no client can overflow them:
    // the display name is capped at 10 chars, and only defined fields are merged (a bare
    // `undefined` would otherwise clobber a previously-saved value).
    const incoming = { ...args.preferences }
    if (typeof incoming.name === "string") {
      const trimmed = incoming.name.trim().slice(0, 10)
      if (trimmed) incoming.name = trimmed
      else delete incoming.name
    }
    if (incoming.dexSources) {
      incoming.dexSources = incoming.dexSources
        .map((source) => source.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 24)
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        authSubject: existing.authSubject ?? authSubject,
        preferences: {
          ...existing.preferences,
          ...incoming,
        },
      })
      return "updated" as const
    }

    await ctx.db.insert("sandboxProfiles", {
      wallet,
      authSubject,
      createdAt: Date.now(),
      seedVersion: SEED_VERSION,
      onboardingStep: "wallet",
      preferences: incoming,
    })
    return "created" as const
  },
})
