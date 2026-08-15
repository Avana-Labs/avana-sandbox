import { v } from "convex/values"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { mutation, query } from "../_generated/server"
import type { Doc, Id } from "../_generated/dataModel"
import { requireSandboxWallet } from "./auth"
import { upsertWalletBalanceRows } from "../wallet/balances"

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60
const COOLDOWN_MS = 20 * 24 * 60 * 60 * 1000
const WITHDRAWAL_WINDOW_MS = 2 * 24 * 60 * 60 * 1000

const umbrellaMarketId = v.union(v.literal("gho"), v.literal("usdc"), v.literal("usdt"), v.literal("weth"))
const umbrellaActionKind = v.union(
  v.literal("stake"),
  v.literal("claim"),
  v.literal("startCooldown"),
  v.literal("unstake"),
)

const UMBRELLA_MARKETS = {
  gho: {
    id: "gho",
    asset: "Stake GHO",
    symbol: "GHO",
    coverage: "GHO deficits",
    totalStakedUsd: 25_000_000,
    apy: 6.4,
    rewardApy: 6.4,
    baseApy: 0,
    priceUsd: 1,
    targetCoverageUsd: 22_000_000,
    currentDeficitUsd: 146,
    deficitOffsetUsd: 1_000_000,
    amountInCooldownUsd: 2_500_000,
  },
  usdc: {
    id: "usdc",
    asset: "Stake USDC",
    symbol: "USDC",
    coverage: "USDC deficits",
    totalStakedUsd: 12_000_000,
    apy: 4.84,
    rewardApy: 3.12,
    baseApy: 1.72,
    priceUsd: 1,
    targetCoverageUsd: 10_000_000,
    currentDeficitUsd: 51_371,
    deficitOffsetUsd: 500_000,
    amountInCooldownUsd: 1_150_000,
  },
  usdt: {
    id: "usdt",
    asset: "Stake USDT",
    symbol: "USDT",
    coverage: "USDT deficits",
    totalStakedUsd: 11_000_000,
    apy: 4.19,
    rewardApy: 2.85,
    baseApy: 1.34,
    priceUsd: 1,
    targetCoverageUsd: 9_500_000,
    currentDeficitUsd: 32_420,
    deficitOffsetUsd: 400_000,
    amountInCooldownUsd: 980_000,
  },
  weth: {
    id: "weth",
    asset: "Stake WETH",
    symbol: "WETH",
    coverage: "WETH deficits",
    totalStakedUsd: 7_000_000,
    apy: 5.05,
    rewardApy: 2.4,
    baseApy: 2.65,
    priceUsd: 2240,
    targetCoverageUsd: 6_250_000,
    currentDeficitUsd: 52_973,
    deficitOffsetUsd: 250_000,
    amountInCooldownUsd: 520_000,
  },
} as const

type UmbrellaMarketId = keyof typeof UMBRELLA_MARKETS

function usd6(value: number) {
  return String(Math.max(0, Math.round(value * 1_000_000)))
}

function numberFromUsd6(value?: string) {
  return Number(BigInt(value ?? "0")) / 1_000_000
}

function tokenAmountFromUsd(marketId: UmbrellaMarketId, usd: number) {
  const priceUsd = UMBRELLA_MARKETS[marketId].priceUsd
  return priceUsd > 0 ? usd / priceUsd : usd
}

function rewardAccruedUsd(position: Doc<"positions">, now: number) {
  if (position.product !== "umbrella" || position.status !== "open") return 0
  const market = UMBRELLA_MARKETS[position.marketSlug as UmbrellaMarketId]
  if (!market) return 0
  const principalUsd = numberFromUsd6(position.suppliedUsd6)
  const elapsedSeconds = Math.max(0, (now - position.lastUpdatedAt) / 1000)
  return principalUsd * (market.rewardApy / 100) * (elapsedSeconds / SECONDS_PER_YEAR)
}

async function upsertUmbrellaBalance(
  ctx: MutationCtx,
  wallet: string,
  row: {
    marketId: UmbrellaMarketId
    amount: number
    valueUsd: number
    state: "available" | "staked" | "cooling" | "withdrawalWindow" | "claimableRewards"
  },
  now: number,
) {
  const market = UMBRELLA_MARKETS[row.marketId]
  const rows = await ctx.db
    .query("walletUmbrellaBalances")
    .withIndex("by_wallet_market_state", (q) => q.eq("wallet", wallet).eq("marketId", row.marketId).eq("state", row.state))
    .collect()
  const existing = rows[0]
  const next = {
    wallet,
    marketId: row.marketId,
    assetId: row.marketId,
    symbol: market.symbol,
    amount: Math.max(0, row.amount),
    valueUsd: Math.max(0, row.valueUsd),
    state: row.state,
    updatedAt: now,
  }
  if (existing) await ctx.db.patch(existing._id, next)
  else if (next.amount > 0 || next.valueUsd > 0) await ctx.db.insert("walletUmbrellaBalances", next)
}

async function upsertLiquidBalance(ctx: MutationCtx, wallet: string, marketId: UmbrellaMarketId, amount: number, now: number) {
  const market = UMBRELLA_MARKETS[marketId]
  const valueUsd = amount * market.priceUsd
  const existing = await ctx.db
    .query("sandboxBalances")
    .withIndex("by_wallet_asset", (q) => q.eq("wallet", wallet).eq("assetSlug", marketId))
    .unique()
  if (existing) {
    await ctx.db.patch(existing._id, { amount, valueUsd, priceUsd: market.priceUsd, updatedAt: now })
  } else if (amount > 0) {
    await ctx.db.insert("sandboxBalances", {
      wallet,
      assetSlug: marketId,
      symbol: market.symbol,
      amount,
      valueUsd,
      priceUsd: market.priceUsd,
      updatedAt: now,
    })
  }
  await upsertWalletBalanceRows(ctx, [
    {
      wallet,
      assetId: marketId,
      amount,
      sourceType: "wallet",
      assetKind: "wallet",
      symbol: market.symbol,
      valueUsd6: usd6(valueUsd),
    },
  ])
  await upsertUmbrellaBalance(ctx, wallet, { marketId, amount, valueUsd, state: "available" }, now)
}

async function readLiquidBalance(ctx: QueryCtx | MutationCtx, wallet: string, marketId: UmbrellaMarketId) {
  const row = await ctx.db
    .query("sandboxBalances")
    .withIndex("by_wallet_asset", (q) => q.eq("wallet", wallet).eq("assetSlug", marketId))
    .unique()
  return row?.amount ?? 0
}

async function readUmbrellaPosition(ctx: QueryCtx | MutationCtx, wallet: string, marketId: UmbrellaMarketId) {
  return await ctx.db
    .query("positions")
    .withIndex("by_wallet_product_market", (q) => q.eq("wallet", wallet).eq("product", "umbrella").eq("marketSlug", marketId))
    .unique()
}

async function syncPositionBalances(ctx: MutationCtx, wallet: string, position: Doc<"positions">, now: number) {
  const marketId = position.marketSlug as UmbrellaMarketId
  const market = UMBRELLA_MARKETS[marketId]
  if (!market) return
  const stakedUsd = position.status === "open" ? numberFromUsd6(position.suppliedUsd6) : 0
  const cooldownUsd = numberFromUsd6(position.cooldownAmountUsd6)
  const claimableUsd = numberFromUsd6(position.earnedUsd6) + rewardAccruedUsd(position, now)
  const cooldownState = position.cooldownEndsAt && now >= position.cooldownEndsAt ? "withdrawalWindow" : "cooling"
  await upsertUmbrellaBalance(ctx, wallet, {
    marketId,
    amount: tokenAmountFromUsd(marketId, stakedUsd),
    valueUsd: stakedUsd,
    state: "staked",
  }, now)
  await upsertUmbrellaBalance(ctx, wallet, {
    marketId,
    amount: tokenAmountFromUsd(marketId, cooldownUsd),
    valueUsd: cooldownUsd,
    state: cooldownUsd > 0 ? cooldownState : "cooling",
  }, now)
  await upsertUmbrellaBalance(ctx, wallet, {
    marketId,
    amount: claimableUsd,
    valueUsd: claimableUsd,
    state: "claimableRewards",
  }, now)
}

export const getSessionState = query({
  args: { wallet: v.string() },
  handler: async (ctx, { wallet }) => {
    const authed = await requireSandboxWallet(ctx, wallet)
    const now = Date.now()
    const marketIds = Object.keys(UMBRELLA_MARKETS) as UmbrellaMarketId[]
    const [balances, positions, transactions, aggregatesPerMarket] = await Promise.all([
      Promise.all(marketIds.map((marketId) => readLiquidBalance(ctx, authed, marketId))),
      ctx.db
        .query("positions")
        .withIndex("by_wallet_product", (q) => q.eq("wallet", authed).eq("product", "umbrella"))
        .collect(),
      ctx.db
        .query("transactions")
        .withIndex("by_wallet_product_at", (q) => q.eq("wallet", authed).eq("product", "umbrella"))
        .order("desc")
        .collect(),
      // Live market-level aggregates: sum every wallet's suppliedUsd6 and
      // cooldownAmountUsd6 for each umbrella market so Coverage and Amount in
      // cooldown move as users stake / cool / unstake. Added on top of the
      // catalog baseline (which represents pre-existing external liquidity).
      Promise.all(
        marketIds.map(async (marketId) => {
          const rows = await ctx.db
            .query("positions")
            .withIndex("by_product_market", (q) => q.eq("product", "umbrella").eq("marketSlug", marketId))
            .collect()
          let stakedUsd = 0
          let cooldownUsd = 0
          for (const row of rows) {
            stakedUsd += numberFromUsd6(row.suppliedUsd6)
            cooldownUsd += numberFromUsd6(row.cooldownAmountUsd6)
          }
          return { marketId, stakedUsd, cooldownUsd }
        }),
      ),
    ])
    // Fold each per-wallet aggregate into the catalog baseline. The catalog
    // holds Target / APY / Deficit Offset / Active Deficit / priceUsd as
    // static config; only totalStakedUsd and amountInCooldownUsd move live.
    const liveMarkets = Object.fromEntries(
      marketIds.map((marketId) => {
        const base = UMBRELLA_MARKETS[marketId]
        const agg = aggregatesPerMarket.find((row) => row.marketId === marketId)
        return [
          marketId,
          {
            ...base,
            totalStakedUsd: base.totalStakedUsd + (agg?.stakedUsd ?? 0),
            amountInCooldownUsd: base.amountInCooldownUsd + (agg?.cooldownUsd ?? 0),
          },
        ]
      }),
    ) as typeof UMBRELLA_MARKETS
    return {
      walletId: authed,
      markets: liveMarkets,
      walletBalances: Object.fromEntries(marketIds.map((marketId, index) => [marketId, balances[index] ?? 0])),
      positions: positions.map((position) => ({
        _id: position._id,
        marketId: position.marketSlug,
        suppliedUsd: numberFromUsd6(position.suppliedUsd6),
        amount: tokenAmountFromUsd(position.marketSlug as UmbrellaMarketId, numberFromUsd6(position.suppliedUsd6)),
        pendingRewardsUsd: numberFromUsd6(position.earnedUsd6) + rewardAccruedUsd(position, now),
        claimedRewardsUsd: numberFromUsd6(position.claimedRewardsUsd6),
        cooldownUsd: numberFromUsd6(position.cooldownAmountUsd6),
        cooldownStartedAt: position.cooldownStartedAt,
        cooldownEndsAt: position.cooldownEndsAt,
        withdrawalWindowEndsAt: position.withdrawalWindowEndsAt,
        status: position.status,
        lastUpdatedAt: position.lastUpdatedAt,
      })),
      transactions: transactions.map((row) => ({
        id: String(row._id),
        intentId: row.intentId,
        kind: row.kind,
        marketId: row.marketSlug,
        amountUsd: row.amountUsd,
        syntheticTxHash: row.syntheticTxHash,
        status: row.status,
        at: row.at,
      })),
    }
  },
})

export const recordAction = mutation({
  args: {
    wallet: v.string(),
    intentId: v.string(),
    kind: umbrellaActionKind,
    marketId: umbrellaMarketId,
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const existingTx = await ctx.db
      .query("transactions")
      .withIndex("by_wallet_intent", (q) => q.eq("wallet", wallet).eq("intentId", args.intentId))
      .unique()
    if (existingTx) return { idempotent: true, receipt: existingTx }

    const market = UMBRELLA_MARKETS[args.marketId]
    const amount = Math.max(0, args.amount)
    if (args.kind !== "claim" && amount <= 0) throw new Error("INVALID_AMOUNT")
    const now = Date.now()
    const liquid = await readLiquidBalance(ctx, wallet, args.marketId)
    const position = await readUmbrellaPosition(ctx, wallet, args.marketId)
    const accruedUsd = position ? rewardAccruedUsd(position, now) : 0
    const earnedUsd = position ? numberFromUsd6(position.earnedUsd6) + accruedUsd : 0
    const suppliedUsd = position ? numberFromUsd6(position.suppliedUsd6) : 0
    const cooldownUsd = position ? numberFromUsd6(position.cooldownAmountUsd6) : 0
    const amountUsd = amount * market.priceUsd
    let nextPositionId: Id<"positions"> | undefined = position?._id
    let txAmountUsd = amountUsd

    if (args.kind === "stake") {
      if (amount > liquid) throw new Error("INSUFFICIENT_BALANCE")
      await upsertLiquidBalance(ctx, wallet, args.marketId, liquid - amount, now)
      const nextSuppliedUsd = suppliedUsd + amountUsd
      const payload = {
        wallet,
        product: "umbrella" as const,
        marketSlug: args.marketId,
        assetId: args.marketId,
        status: "open" as const,
        suppliedUsd6: usd6(nextSuppliedUsd),
        earnedUsd6: usd6(earnedUsd),
        supplyApyPct: market.apy,
        cooldownAmountUsd6: usd6(cooldownUsd),
        openedAt: position?.openedAt ?? now,
        lastUpdatedAt: now,
        openTxSynthetic: position?.openTxSynthetic,
        revision: (position?.revision ?? 0) + 1,
      }
      nextPositionId = position ? position._id : await ctx.db.insert("positions", { ...payload, openTxSynthetic: `sim-umb-${now.toString(36)}` })
      if (position) await ctx.db.patch(position._id, payload)
    } else if (args.kind === "claim") {
      if (!position || earnedUsd <= 0) throw new Error("NO_REWARDS")
      txAmountUsd = earnedUsd
      await ctx.db.patch(position._id, {
        earnedUsd6: "0",
        claimedRewardsUsd6: usd6(numberFromUsd6(position.claimedRewardsUsd6) + earnedUsd),
        lastUpdatedAt: now,
        revision: (position.revision ?? 0) + 1,
      })
    } else if (args.kind === "startCooldown") {
      if (!position || amountUsd > suppliedUsd - cooldownUsd) throw new Error("INVALID_COOLDOWN_AMOUNT")
      await ctx.db.patch(position._id, {
        earnedUsd6: usd6(earnedUsd),
        cooldownAmountUsd6: usd6(cooldownUsd + amountUsd),
        cooldownStartedAt: now,
        cooldownEndsAt: now + COOLDOWN_MS,
        withdrawalWindowEndsAt: now + COOLDOWN_MS + WITHDRAWAL_WINDOW_MS,
        lastUpdatedAt: now,
        revision: (position.revision ?? 0) + 1,
      })
    } else {
      if (!position || !position.cooldownEndsAt || now < position.cooldownEndsAt) throw new Error("COOLDOWN_NOT_READY")
      if (position.withdrawalWindowEndsAt && now > position.withdrawalWindowEndsAt) throw new Error("WITHDRAWAL_WINDOW_EXPIRED")
      if (amountUsd > cooldownUsd) throw new Error("INSUFFICIENT_COOLDOWN_BALANCE")
      await upsertLiquidBalance(ctx, wallet, args.marketId, liquid + amount, now)
      const nextSuppliedUsd = Math.max(0, suppliedUsd - amountUsd)
      await ctx.db.patch(position._id, {
        status: nextSuppliedUsd > 0 ? "open" : "closed",
        suppliedUsd6: usd6(nextSuppliedUsd),
        earnedUsd6: usd6(earnedUsd),
        cooldownAmountUsd6: usd6(Math.max(0, cooldownUsd - amountUsd)),
        lastUpdatedAt: now,
        closedAt: nextSuppliedUsd > 0 ? undefined : now,
        revision: (position.revision ?? 0) + 1,
      })
    }

    const updatedPosition = nextPositionId ? await ctx.db.get(nextPositionId) : null
    if (updatedPosition) await syncPositionBalances(ctx, wallet, updatedPosition, now)

    const syntheticTxHash = `sim-umbrella-${args.kind}-${args.marketId}-${now.toString(36)}`
    const receipt = await ctx.db.insert("transactions", {
      wallet,
      intentId: args.intentId,
      product: "umbrella",
      kind: args.kind,
      status: "success",
      marketSlug: args.marketId,
      assetId: args.marketId,
      positionId: nextPositionId,
      requestedAmountUsd6: usd6(txAmountUsd),
      executedAmountUsd6: usd6(txAmountUsd),
      amountUsd: txAmountUsd,
      syntheticTxHash,
      simulated: true,
      at: now,
    })
    await ctx.db.insert("sandboxActivity", {
      wallet,
      kind: `umbrella_${args.kind}`,
      amountUsd: txAmountUsd,
      marketSlug: args.marketId,
      syntheticTxHash,
      at: now,
    })
    return { idempotent: false, receipt: (await ctx.db.get(receipt))! }
  },
})

/**
 * Fixture seed for the open-gate test wallet (0x0000…0a11). Populates the four
 * umbrella markets with staked positions, cooldown state, pending rewards, and
 * a matching set of wallet balances so /umbrella has content to demo against
 * without walking through the full onboarding flow.
 *
 * Guardrails:
 *  - Requires an authenticated sandbox wallet.
 *  - Only the canonical test wallet address is allowed to call this — production
 *    users always run through the real onboarding claim.
 *  - Idempotent: exits early if the wallet already has any umbrella positions.
 */
const TEST_WALLET_ADDRESS = "0x0000000000000000000000000000000000000a11"

const UMBRELLA_TEST_FIXTURE = {
  balances: [
    { assetSlug: "gho", symbol: "GHO", amount: 20_000, priceUsd: 1 },
    { assetSlug: "usdc", symbol: "USDC", amount: 25_000, priceUsd: 1 },
    { assetSlug: "usdt", symbol: "USDT", amount: 15_000, priceUsd: 1 },
    { assetSlug: "weth", symbol: "WETH", amount: 5, priceUsd: 2240 },
  ],
  positions: [
    { marketId: "gho" as const, suppliedUsd: 5_000, earnedUsd: 11.4, cooldownUsd: 2_500, cooldownOffsetMs: 11 * 24 * 60 * 60 * 1000 },
    { marketId: "usdc" as const, suppliedUsd: 8_000, earnedUsd: 18.25, cooldownUsd: 0, cooldownOffsetMs: null },
    { marketId: "usdt" as const, suppliedUsd: 0, earnedUsd: 0, cooldownUsd: 0, cooldownOffsetMs: null },
    { marketId: "weth" as const, suppliedUsd: 6_720, earnedUsd: 9.1, cooldownUsd: 0, cooldownOffsetMs: null },
  ],
} as const

export const ensureTestWalletFixtures = mutation({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    if (wallet !== TEST_WALLET_ADDRESS) return { seeded: false, reason: "not-test-wallet" as const }

    const existing = await ctx.db
      .query("positions")
      .withIndex("by_wallet_product", (q) => q.eq("wallet", wallet).eq("product", "umbrella"))
      .collect()
    if (existing.length > 0) return { seeded: false, reason: "already-seeded" as const }

    const now = Date.now()
    for (const balance of UMBRELLA_TEST_FIXTURE.balances) {
      const marketId = balance.assetSlug as UmbrellaMarketId
      await upsertLiquidBalance(ctx, wallet, marketId, balance.amount, now)
    }

    for (const position of UMBRELLA_TEST_FIXTURE.positions) {
      if (position.suppliedUsd <= 0) continue
      const cooldownStartedAt = position.cooldownOffsetMs == null ? undefined : now - position.cooldownOffsetMs
      const cooldownEndsAt = cooldownStartedAt == null ? undefined : cooldownStartedAt + COOLDOWN_MS
      const withdrawalWindowEndsAt = cooldownEndsAt == null ? undefined : cooldownEndsAt + WITHDRAWAL_WINDOW_MS
      const hash = `sim-umbrella-fixture-${position.marketId}-${now.toString(36)}`
      const positionId = await ctx.db.insert("positions", {
        wallet,
        product: "umbrella",
        marketSlug: position.marketId,
        assetId: position.marketId,
        status: "open",
        suppliedUsd6: usd6(position.suppliedUsd),
        earnedUsd6: usd6(position.earnedUsd),
        supplyApyPct: UMBRELLA_MARKETS[position.marketId].apy,
        cooldownAmountUsd6: usd6(position.cooldownUsd),
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
        intentId: `fixture-umbrella-${position.marketId}`,
        product: "umbrella",
        kind: "stake",
        status: "success",
        marketSlug: position.marketId,
        assetId: position.marketId,
        positionId,
        requestedAmountUsd6: usd6(position.suppliedUsd),
        executedAmountUsd6: usd6(position.suppliedUsd),
        amountUsd: position.suppliedUsd,
        syntheticTxHash: hash,
        simulated: true,
        at: now,
      })
      const inserted = await ctx.db.get(positionId)
      if (inserted) await syncPositionBalances(ctx, wallet, inserted, now)
    }

    return { seeded: true }
  },
})
