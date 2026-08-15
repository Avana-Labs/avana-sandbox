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

/**
 * Single source of truth for the onboarding wallet seed's per-token prices.
 * Onboarding and ensureTestWalletFixtures reference these instead of hard-coding
 * a divergent price (weth previously drifted: 1934 in onboarding, 2240 here).
 */
export const UMBRELLA_ONBOARDING_TOKEN_PRICES: Record<UmbrellaMarketId, number> = {
  gho: UMBRELLA_MARKETS.gho.priceUsd,
  usdc: UMBRELLA_MARKETS.usdc.priceUsd,
  usdt: UMBRELLA_MARKETS.usdt.priceUsd,
  weth: UMBRELLA_MARKETS.weth.priceUsd,
}

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
  // Use `rewardCheckpointAt` as the accrual clock. Every non-checkpointing
  // patch (balance sync, deficit sim, dev advance) touches `lastUpdatedAt`,
  // so relying on lastUpdatedAt made rewards silently reset on every action.
  // Fall back to lastUpdatedAt for pre-existing rows that predate the field.
  const checkpoint = position.rewardCheckpointAt ?? position.lastUpdatedAt
  const elapsedSeconds = Math.max(0, (now - checkpoint) / 1000)
  return principalUsd * (market.rewardApy / 100) * (elapsedSeconds / SECONDS_PER_YEAR)
}

/**
 * Umbrella liquid-balance writer. Every umbrella stake/unstake mutates the
 * user's spendable balance for the market's underlying token (gho / usdc /
 * usdt / weth), so the write must land in every store that any other product
 * reads:
 *
 *   1. `sandboxBalances` — read by the Convex portfolio snapshot
 *      (`appendPortfolioSnapshot`) and by both `getSessionState` /
 *      `getPortfolioPageState` in convex/sandbox/transactions.ts. If we skip
 *      this, the portfolio "liquid" total drifts by whatever amount the wallet
 *      staked. Onboarding writes the same shape (see convex/sandbox/onboarding.ts
 *      around the starter-allocation loop), so keeping the write here is the
 *      invariant, not a special case.
 *   2. `walletLiquidBalances` — the source of truth Lend / Swap / Borrow read
 *      through `productBalances.listForWallet`. This is the "one wallet
 *      balance" every other product sees.
 *   3. `walletBalances` (via `upsertWalletBalanceRows`) — the shared aggregate
 *      ledger.
 *
 * The three stores are kept in lockstep here so umbrella's post-stake
 * spendable balance is indistinguishable from what every other product would
 * see: staking 100 GHO decrements the GHO row in each store by the same
 * amount, in the same mutation.
 */
async function upsertLiquidBalance(
  ctx: MutationCtx,
  wallet: string,
  marketId: UmbrellaMarketId,
  amount: number,
  now: number,
) {
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
  // walletLiquidBalances mirrors the "available" bucket every other product
  // reads via productBalances.listForWallet. Written here (not in
  // upsertWalletBalanceRows) because the shared aggregate ledger doesn't own
  // product-specific balance tables.
  const liquidRows = await ctx.db
    .query("walletLiquidBalances")
    .withIndex("by_wallet_asset", (q) => q.eq("wallet", wallet).eq("assetId", marketId))
    .collect()
  const liquidExisting = liquidRows[0]
  const liquidNext = {
    wallet,
    assetId: marketId,
    symbol: market.symbol,
    amount: Math.max(0, amount),
    valueUsd: Math.max(0, valueUsd),
    state: "available" as const,
    updatedAt: now,
  }
  if (liquidExisting) await ctx.db.patch(liquidExisting._id, liquidNext)
  else if (liquidNext.amount > 0 || liquidNext.valueUsd > 0)
    await ctx.db.insert("walletLiquidBalances", liquidNext)
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
    .withIndex("by_wallet_product_market", (q) =>
      q.eq("wallet", wallet).eq("product", "umbrella").eq("marketSlug", marketId),
    )
    .unique()
}

/**
 * Read the live umbrella market-state overlay (deficit + slash counters) from
 * `umbrellaMarketState`, falling back to the frozen catalog values when a
 * market has no row yet. Used by getSessionState to fold live values into the
 * markets map, and by simulateDeficit / simulateSlash for read-modify-write.
 */
async function readUmbrellaMarketOverlay(ctx: QueryCtx | MutationCtx, marketId: UmbrellaMarketId) {
  const row = await ctx.db
    .query("umbrellaMarketState")
    .withIndex("by_market", (q) => q.eq("marketId", marketId))
    .unique()
  const catalog = UMBRELLA_MARKETS[marketId]
  return {
    row,
    currentDeficitUsd: row?.currentDeficitUsd ?? catalog.currentDeficitUsd,
    deficitOffsetUsd: row?.deficitOffsetUsd ?? catalog.deficitOffsetUsd,
    totalSlashedUsd: row?.totalSlashedUsd ?? 0,
  }
}

/**
 * Shared dev-controls guard. `simulateDeficit`, `simulateSlash`, and
 * `dev.advanceCooldown` all check this so production wallets can never trigger
 * time-warp / stress mutations. The env var is set only in `.env.local`.
 */
export function assertSandboxDevControlsEnabled() {
  if (process.env.SANDBOX_DEV_CONTROLS !== "true") throw new Error("DEV_CONTROLS_DISABLED")
}

export const getSessionState = query({
  args: { wallet: v.string() },
  handler: async (ctx, { wallet }) => {
    const authed = await requireSandboxWallet(ctx, wallet)
    const now = Date.now()
    const marketIds = Object.keys(UMBRELLA_MARKETS) as UmbrellaMarketId[]
    const [balances, positions, transactions, aggregatesPerMarket, overlays] = await Promise.all([
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
      Promise.all(marketIds.map((marketId) => readUmbrellaMarketOverlay(ctx, marketId))),
    ])
    // Fold each per-wallet aggregate + the live umbrellaMarketState overlay
    // into the catalog baseline. The catalog holds Target / APY / priceUsd as
    // static config; totalStakedUsd / amountInCooldownUsd move live from the
    // aggregate, and currentDeficitUsd / deficitOffsetUsd / totalSlashedUsd
    // come from the overlay (with catalog fallback).
    const liveMarkets = Object.fromEntries(
      marketIds.map((marketId, index) => {
        const base = UMBRELLA_MARKETS[marketId]
        const agg = aggregatesPerMarket.find((row) => row.marketId === marketId)
        const overlay = overlays[index]
        // `agg.stakedUsd` and `agg.cooldownUsd` are sums over
        // `positions.suppliedUsd6` / `cooldownAmountUsd6`, both non-negative
        // by construction (usd6() clamps to Math.max(0, …) on every write in
        // recordAction / simulateSlash). So `base + agg` stays >= base >= 0
        // and no guard against a negative fold is needed here.
        return [
          marketId,
          {
            ...base,
            totalStakedUsd: base.totalStakedUsd + (agg?.stakedUsd ?? 0),
            amountInCooldownUsd: base.amountInCooldownUsd + (agg?.cooldownUsd ?? 0),
            currentDeficitUsd: overlay.currentDeficitUsd,
            deficitOffsetUsd: overlay.deficitOffsetUsd,
            totalSlashedUsd: overlay.totalSlashedUsd,
          },
        ]
      }),
    )
    return {
      walletId: authed,
      markets: liveMarkets,
      walletBalances: Object.fromEntries(marketIds.map((marketId, index) => [marketId, balances[index] ?? 0])),
      positions: positions.map((position) => {
        const withdrawalWindowExpired =
          !!position.withdrawalWindowEndsAt &&
          now > position.withdrawalWindowEndsAt &&
          numberFromUsd6(position.cooldownAmountUsd6) > 0
        return {
          _id: position._id,
          marketId: position.marketSlug as UmbrellaMarketId,
          suppliedUsd: numberFromUsd6(position.suppliedUsd6),
          amount: tokenAmountFromUsd(position.marketSlug as UmbrellaMarketId, numberFromUsd6(position.suppliedUsd6)),
          pendingRewardsUsd: numberFromUsd6(position.earnedUsd6) + rewardAccruedUsd(position, now),
          claimedRewardsUsd: numberFromUsd6(position.claimedRewardsUsd6),
          cooldownUsd: numberFromUsd6(position.cooldownAmountUsd6),
          cooldownStartedAt: position.cooldownStartedAt,
          cooldownEndsAt: position.cooldownEndsAt,
          withdrawalWindowEndsAt: position.withdrawalWindowEndsAt,
          withdrawalWindowExpired,
          status: position.status,
          lastUpdatedAt: position.lastUpdatedAt,
        }
      }),
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
        // Re-checkpoint reward accrual on stake — earnedUsd already folded
        // in the accrual up to `now`, so restart the clock from here.
        rewardCheckpointAt: now,
        openTxSynthetic: position?.openTxSynthetic,
        revision: (position?.revision ?? 0) + 1,
      }
      nextPositionId = position
        ? position._id
        : await ctx.db.insert("positions", { ...payload, openTxSynthetic: `sim-umb-${now.toString(36)}` })
      if (position) await ctx.db.patch(position._id, payload)
    } else if (args.kind === "claim") {
      if (!position || earnedUsd <= 0) throw new Error("NO_REWARDS")
      txAmountUsd = earnedUsd
      await ctx.db.patch(position._id, {
        earnedUsd6: "0",
        claimedRewardsUsd6: usd6(numberFromUsd6(position.claimedRewardsUsd6) + earnedUsd),
        lastUpdatedAt: now,
        // Claim zeroes earnedUsd6 — restart accrual from now.
        rewardCheckpointAt: now,
        revision: (position.revision ?? 0) + 1,
      })
    } else if (args.kind === "startCooldown") {
      if (!position || amountUsd > suppliedUsd - cooldownUsd) throw new Error("INVALID_COOLDOWN_AMOUNT")
      // Reject a second cooldown tranche while another one is still active.
      // The schema stores a single cooldownStartedAt/EndsAt/windowEndsAt per
      // position, so multi-tranche cooldowns would need per-tranche rows —
      // that's a future refactor. Until then, force the user to finish or
      // unstake the current cooldown before starting a new one. This block
      // also catches the "expired-and-unclaimed" case (window passed but
      // cooldownAmount > 0) so we never silently overwrite the expired
      // tranche's cooldownStartedAt with the new one.
      const hasActiveCooldown =
        cooldownUsd > 0 &&
        !!position.cooldownEndsAt &&
        (now < position.cooldownEndsAt ||
          (position.withdrawalWindowEndsAt !== undefined && now >= position.cooldownEndsAt))
      if (hasActiveCooldown) throw new Error("COOLDOWN_ALREADY_ACTIVE")
      await ctx.db.patch(position._id, {
        earnedUsd6: usd6(earnedUsd),
        cooldownAmountUsd6: usd6(cooldownUsd + amountUsd),
        cooldownStartedAt: now,
        cooldownEndsAt: now + COOLDOWN_MS,
        withdrawalWindowEndsAt: now + COOLDOWN_MS + WITHDRAWAL_WINDOW_MS,
        lastUpdatedAt: now,
        // earnedUsd6 folds in accrual up to `now`, so the reward clock restarts.
        rewardCheckpointAt: now,
        revision: (position.revision ?? 0) + 1,
      })
    } else {
      if (!position || !position.cooldownEndsAt || now < position.cooldownEndsAt) throw new Error("COOLDOWN_NOT_READY")
      if (position.withdrawalWindowEndsAt && now > position.withdrawalWindowEndsAt)
        throw new Error("WITHDRAWAL_WINDOW_EXPIRED")
      if (amountUsd > cooldownUsd) throw new Error("INSUFFICIENT_COOLDOWN_BALANCE")
      await upsertLiquidBalance(ctx, wallet, args.marketId, liquid + amount, now)
      const nextSuppliedUsd = Math.max(0, suppliedUsd - amountUsd)
      await ctx.db.patch(position._id, {
        status: nextSuppliedUsd > 0 ? "open" : "closed",
        suppliedUsd6: usd6(nextSuppliedUsd),
        earnedUsd6: usd6(earnedUsd),
        cooldownAmountUsd6: usd6(Math.max(0, cooldownUsd - amountUsd)),
        lastUpdatedAt: now,
        // earnedUsd6 folds accrual up to `now`; reset the clock.
        rewardCheckpointAt: now,
        closedAt: nextSuppliedUsd > 0 ? undefined : now,
        revision: (position.revision ?? 0) + 1,
      })
    }

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
    { assetSlug: "gho" as UmbrellaMarketId, symbol: "GHO", amount: 20_000 },
    { assetSlug: "usdc" as UmbrellaMarketId, symbol: "USDC", amount: 25_000 },
    { assetSlug: "usdt" as UmbrellaMarketId, symbol: "USDT", amount: 15_000 },
    { assetSlug: "weth" as UmbrellaMarketId, symbol: "WETH", amount: 5 },
  ],
  positions: [
    {
      marketId: "gho" as const,
      suppliedUsd: 5_000,
      earnedUsd: 11.4,
      cooldownUsd: 2_500,
      cooldownOffsetMs: 11 * 24 * 60 * 60 * 1000,
    },
    { marketId: "usdc" as const, suppliedUsd: 8_000, earnedUsd: 18.25, cooldownUsd: 0, cooldownOffsetMs: null },
    { marketId: "usdt" as const, suppliedUsd: 0, earnedUsd: 0, cooldownUsd: 0, cooldownOffsetMs: null },
    { marketId: "weth" as const, suppliedUsd: 6_720, earnedUsd: 9.1, cooldownUsd: 0, cooldownOffsetMs: null },
  ],
} as const

/**
 * Shared umbrella-seed helper. Seeds wallet balances (sandboxBalances +
 * walletLiquidBalances via upsertLiquidBalance) and open umbrella positions,
 * plus one `sandboxActivity` row per seeded position matching the shape
 * `recordAction` produces (`umbrella_stake`). Both `ensureTestWalletFixtures`
 * and the onboarding claim call this so onboarding parity is by construction.
 *
 * Idempotency is the caller's job: this helper unconditionally writes.
 */
export async function seedUmbrellaWallet(ctx: MutationCtx, wallet: string, now: number) {
  const receiptHashes: string[] = []

  for (const balance of UMBRELLA_TEST_FIXTURE.balances) {
    await upsertLiquidBalance(ctx, wallet, balance.assetSlug, balance.amount, now)
  }

  for (const position of UMBRELLA_TEST_FIXTURE.positions) {
    if (position.suppliedUsd <= 0) continue
    const cooldownStartedAt = position.cooldownOffsetMs == null ? undefined : now - position.cooldownOffsetMs
    const cooldownEndsAt = cooldownStartedAt == null ? undefined : cooldownStartedAt + COOLDOWN_MS
    const withdrawalWindowEndsAt = cooldownEndsAt == null ? undefined : cooldownEndsAt + WITHDRAWAL_WINDOW_MS
    const hash = `sim-umbrella-seed-${position.marketId}-${now.toString(36)}`
    receiptHashes.push(hash)
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
      rewardCheckpointAt: now,
      openTxSynthetic: hash,
      revision: 1,
    })
    await ctx.db.insert("transactions", {
      wallet,
      intentId: `seed-umbrella-${position.marketId}`,
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
    // Onboarding parity with `recordAction`: every umbrella action writes a
    // sandboxActivity row (`umbrella_stake`), so the seed must too or the
    // sandbox activity feed misses the initial stakes.
    await ctx.db.insert("sandboxActivity", {
      wallet,
      kind: "umbrella_stake",
      amountUsd: position.suppliedUsd,
      marketSlug: position.marketId,
      syntheticTxHash: hash,
      at: now,
    })
  }

  return { receiptHashes }
}

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
    await seedUmbrellaWallet(ctx, wallet, now)
    return { seeded: true }
  },
})

/**
 * Dev-only: overwrite the live deficit for a market so the stress view can
 * demo a realized loss > deficit offset. Gated by `SANDBOX_DEV_CONTROLS=true`.
 */
export const simulateDeficit = mutation({
  args: { wallet: v.string(), marketId: umbrellaMarketId, realizedUsd: v.number() },
  handler: async (ctx, args) => {
    assertSandboxDevControlsEnabled()
    await requireSandboxWallet(ctx, args.wallet)
    const overlay = await readUmbrellaMarketOverlay(ctx, args.marketId)
    const now = Date.now()
    const next = {
      marketId: args.marketId,
      currentDeficitUsd: Math.max(0, args.realizedUsd),
      deficitOffsetUsd: overlay.deficitOffsetUsd,
      totalSlashedUsd: overlay.totalSlashedUsd,
      updatedAt: now,
    }
    if (overlay.row) await ctx.db.patch(overlay.row._id, next)
    else await ctx.db.insert("umbrellaMarketState", next)
    return { marketId: args.marketId, currentDeficitUsd: next.currentDeficitUsd }
  },
})

/**
 * Dev-only: apply pro-rata slashing across every open position for a market
 * when the live deficit exceeds the deficit offset. Active stake and cooling
 * stake are both eligible (matches umbrella spec: slashing applies until the
 * withdrawal window closes); closed positions are exempt.
 */
export const simulateSlash = mutation({
  args: { wallet: v.string(), marketId: umbrellaMarketId },
  handler: async (ctx, args) => {
    assertSandboxDevControlsEnabled()
    await requireSandboxWallet(ctx, args.wallet)
    const overlay = await readUmbrellaMarketOverlay(ctx, args.marketId)
    const slashable = Math.max(0, overlay.currentDeficitUsd - overlay.deficitOffsetUsd)
    if (slashable <= 0) return { slashedUsd: 0, affected: 0 }
    const now = Date.now()

    const positions = await ctx.db
      .query("positions")
      .withIndex("by_product_market", (q) => q.eq("product", "umbrella").eq("marketSlug", args.marketId))
      .collect()
    const openPositions = positions.filter((row) => row.status === "open")
    let totalEligibleUsd = 0
    for (const row of openPositions) {
      totalEligibleUsd += numberFromUsd6(row.suppliedUsd6) + numberFromUsd6(row.cooldownAmountUsd6)
    }
    if (totalEligibleUsd <= 0) return { slashedUsd: 0, affected: 0 }

    const cap = Math.min(slashable, totalEligibleUsd)
    const ratio = cap / totalEligibleUsd
    let realized = 0
    for (const row of openPositions) {
      const suppliedUsd = numberFromUsd6(row.suppliedUsd6)
      const cooldownUsd = numberFromUsd6(row.cooldownAmountUsd6)
      const seizeStake = suppliedUsd * ratio
      const seizeCooldown = cooldownUsd * ratio
      const nextSupplied = Math.max(0, suppliedUsd - seizeStake)
      const nextCooldown = Math.max(0, cooldownUsd - seizeCooldown)
      realized += seizeStake + seizeCooldown
      await ctx.db.patch(row._id, {
        suppliedUsd6: usd6(nextSupplied),
        cooldownAmountUsd6: usd6(nextCooldown),
        lastUpdatedAt: now,
        revision: (row.revision ?? 0) + 1,
      })
      await ctx.db.insert("sandboxActivity", {
        wallet: row.wallet,
        kind: "umbrella_slash",
        amountUsd: seizeStake + seizeCooldown,
        marketSlug: args.marketId,
        syntheticTxHash: `sim-umbrella-slash-${args.marketId}-${row._id}-${now.toString(36)}`,
        at: now,
      })
    }

    const nextOverlay = {
      marketId: args.marketId,
      currentDeficitUsd: Math.max(0, overlay.currentDeficitUsd - realized),
      deficitOffsetUsd: overlay.deficitOffsetUsd,
      totalSlashedUsd: overlay.totalSlashedUsd + realized,
      updatedAt: now,
    }
    if (overlay.row) await ctx.db.patch(overlay.row._id, nextOverlay)
    else await ctx.db.insert("umbrellaMarketState", nextOverlay)
    return { slashedUsd: realized, affected: openPositions.length }
  },
})
