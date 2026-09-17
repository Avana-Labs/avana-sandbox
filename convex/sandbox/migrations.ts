import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import type { MutationCtx } from "../_generated/server"
import type { Doc } from "../_generated/dataModel"
import { SANDBOX_TOKEN_PRICE_USD } from "./onboarding"
import { validatedTokenPriceUsd } from "./oraclePrice"
import { resolveWriteBackPriceUsd } from "./writeBackPrice"

/**
 * One-off, idempotent re-value of seeded MULTIPLY positions after the token-price
 * baseline was corrected (ETH-family dropped from the stale ~$3,500 tier to the
 * realistic ~$1,934 tier — see app/lib/prices/sandbox-baseline-prices.ts and the
 * aligned SANDBOX_TOKEN_PRICE_USD map).
 *
 * WHY: a multiply position stores `collateralValueUsd` (the intended gross exposure,
 * an invariant) and `collateralAmount` (a TOKEN quantity frozen at claim-time price).
 * The dashboard re-values exposure as `collateralAmount × currentBaseline`. With the
 * token amount frozen at the old high price, exposure now re-values DOWN while the
 * fixed `debtValueUsd` stays — collapsing equity and pushing seeded positions
 * underwater. Rewriting the token amount from the invariant restores the intended
 * exposure (and therefore LTV / health factor) at the new baseline.
 *
 * FORMULA: collateralAmount = collateralValueUsd / baselinePrice(collateralSymbol).
 * `collateralValueUsd` and `debtValueUsd` are left untouched, so LTV/HF are preserved.
 * Idempotent: it recomputes from the invariant, so re-running is a no-op.
 *
 * Collateral symbol is the first leg of the market slug (e.g. "wsteth-eth" → wsteth).
 */
function baselinePriceForSlug(marketSlug: string): number {
  const symbol = marketSlug.split("-")[0]?.toLowerCase() ?? ""
  return SANDBOX_TOKEN_PRICE_USD[symbol] ?? 1
}

export const migrateMultiplyCollateralToBaseline = internalMutation({
  args: {
    // Optional single-wallet run (used to validate on the test wallet first).
    wallet: v.optional(v.string()),
    // Pagination for the all-wallets sweep.
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { wallet, cursor, batchSize }) => {
    const now = Date.now()
    let scanned = 0
    let migrated = 0

    const applyTo = async (positions: Doc<"positions">[]) => {
      for (const pos of positions) {
        if (pos.product !== "multiply" || pos.status !== "open") continue
        const grossExposureUsd = pos.collateralValueUsd
        if (typeof grossExposureUsd !== "number" || grossExposureUsd <= 0) continue
        scanned++
        const price = baselinePriceForSlug(pos.marketSlug)
        const newAmount = grossExposureUsd / price
        const current = pos.collateralAmount ?? 0
        // Skip if already correct (idempotent / re-runnable).
        if (Math.abs(current - newAmount) <= Math.max(1e-9, newAmount * 1e-9)) continue
        await ctx.db.patch(pos._id, {
          collateralAmount: newAmount,
          lastUpdatedAt: now,
          revision: (pos.revision ?? 0) + 1,
        })
        migrated++
      }
    }

    if (wallet) {
      const rows = await ctx.db
        .query("positions")
        .withIndex("by_wallet_product", (q) => q.eq("wallet", wallet).eq("product", "multiply"))
        .collect()
      await applyTo(rows)
      return { scope: "wallet", wallet, scanned, migrated, isDone: true, continueCursor: null }
    }

    const page = await ctx.db.query("positions").paginate({ cursor: cursor ?? null, numItems: batchSize ?? 200 })
    await applyTo(page.page)
    return { scope: "all", scanned, migrated, isDone: page.isDone, continueCursor: page.continueCursor }
  },
})

/**
 * Backfill: heal product-balance rows that stored a USD figure in the token-quantity `amount` field.
 *
 * The write paths now derive `amount` from a validated oracle price (adjustProductBalanceUsd /
 * upsertProductBalanceValue), but rows created before that fix persist `amount ≈ valueUsd`, and the
 * dashboard reprices non-LP rows as `amount × livePrice` — inflating Net Value by the token price
 * (a 1 AAVE deposit landed `amount: 120.18` → +$14k). DETECTION reuses the write-back rule
 * (writeBackPrice.ts): a row whose implied unit price (`valueUsd / amount`) is ≈1 while the live
 * oracle price is NOT ≈1 is a USD-in-amount row; rewrite `amount = valueUsd / livePrice`. A row with a
 * real (non-$1) implied price is a genuine token quantity and is left untouched, so it is idempotent
 * and safe to re-run; `valueUsd` is canonical and never changes. Scoped to lend + multiply — borrow LP
 * collateral is intentionally USD-denominated and repriced from the live pool price at read time.
 */
async function healUsdInAmount(
  ctx: MutationCtx,
  row: { assetId: string; symbol: string; amount: number; valueUsd: number },
  now: number,
): Promise<number | null> {
  const { amount, valueUsd } = row
  if (!(valueUsd > 0)) return null
  const impliedPriceUsd = amount > 0 && valueUsd > 0 ? valueUsd / amount : null
  // Only the ≈$1-implied (USD-in-amount) signature is a candidate; a real token price is trusted.
  if (impliedPriceUsd != null && Math.abs(impliedPriceUsd - 1) >= 1e-4) return null
  const oraclePriceUsd = await validatedTokenPriceUsd(ctx, row.assetId ?? row.symbol, now)
  const resolvedPriceUsd = resolveWriteBackPriceUsd(impliedPriceUsd, oraclePriceUsd)
  if (!resolvedPriceUsd || !(resolvedPriceUsd > 0)) return null
  const newAmount = valueUsd / resolvedPriceUsd
  // Idempotent: skip when the amount is already correct.
  if (Math.abs(newAmount - amount) <= Math.max(1e-9, newAmount * 1e-9)) return null
  return newAmount
}

export const backfillProductBalanceAmountUnits = internalMutation({
  args: {
    // Optional single-wallet run (validate on the test wallet first).
    wallet: v.optional(v.string()),
    // All-wallets sweep paginates ONE table per call (positions-style cursor).
    table: v.optional(v.union(v.literal("walletLendBalances"), v.literal("walletMultiplyBalances"))),
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { wallet, table, cursor, batchSize },
  ): Promise<{
    scope: "wallet" | "all"
    wallet?: string
    scanned: number
    migrated: number
    isDone: boolean
    continueCursor: string | null
  }> => {
    const now = Date.now()
    let scanned = 0
    let migrated = 0

    const applyLend = async (rows: Doc<"walletLendBalances">[]) => {
      for (const row of rows) {
        scanned++
        const newAmount = await healUsdInAmount(ctx, row, now)
        if (newAmount == null) continue
        await ctx.db.patch(row._id, { amount: newAmount, updatedAt: now })
        migrated++
      }
    }
    const applyMultiply = async (rows: Doc<"walletMultiplyBalances">[]) => {
      for (const row of rows) {
        scanned++
        const newAmount = await healUsdInAmount(ctx, row, now)
        if (newAmount == null) continue
        await ctx.db.patch(row._id, { amount: newAmount, updatedAt: now })
        migrated++
      }
    }

    if (wallet) {
      await applyLend(
        await ctx.db
          .query("walletLendBalances")
          .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
          .collect(),
      )
      await applyMultiply(
        await ctx.db
          .query("walletMultiplyBalances")
          .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
          .collect(),
      )
      return { scope: "wallet", wallet, scanned, migrated, isDone: true, continueCursor: null }
    }

    const numItems = batchSize ?? 200
    const target = table ?? "walletLendBalances"
    if (target === "walletMultiplyBalances") {
      const page = await ctx.db.query("walletMultiplyBalances").paginate({ cursor: cursor ?? null, numItems })
      await applyMultiply(page.page)
      return { scope: "all", scanned, migrated, isDone: page.isDone, continueCursor: page.continueCursor }
    }
    const page = await ctx.db.query("walletLendBalances").paginate({ cursor: cursor ?? null, numItems })
    await applyLend(page.page)
    return { scope: "all", scanned, migrated, isDone: page.isDone, continueCursor: page.continueCursor }
  },
})

/**
 * Rebase onboarding cost-basis snapshots that were pinned to a stale static-fixture price.
 *
 * The wallet P/L reads `sandboxProfiles.basketSnapshot[].priceUsdAtClaim` as the per-token cost basis
 * (app/lib/swap-system/use-convex-wallet-balances.ts → dashboard-wallet-tab.tsx). Wallets onboarded
 * BEFORE a token gained live oracle coverage stored the SANDBOX_TOKEN_PRICE_USD fallback as the basis
 * (e.g. LINK $18), so the leg now valued at a lower LIVE price shows a fake loss (LINK −37%). The claim
 * path already prefers the live oracle for new claims; this heals the legacy snapshots.
 *
 * SAFETY: only a leg whose stored basis still equals the static fixture value it would have fallen
 * back to (`SANDBOX_TOKEN_PRICE_USD[token] ?? 1`) is rebased — a basis captured from a live claim is
 * left alone, so genuine P/L is never erased. Rebasing to the current live price makes a just-granted
 * synthetic leg read ~0 P/L (sane) and accrues correctly from here. Idempotent: after a rebase the
 * basis no longer matches the fixture signature, so a re-run is a no-op. Scoped to the tokens that
 * gained coverage after launch; override `tokens` to widen or narrow. `amount` is untouched (the leg's
 * under/over-grant sizing is a separate reseed concern).
 */
const DEFAULT_STALE_BASIS_TOKENS = ["link", "arb", "op", "ldo", "crv", "bal", "aero", "eurc"]

export const rebaseOnboardingStaleBasis = internalMutation({
  args: {
    // Optional single-wallet run (validate on the test wallet first).
    wallet: v.optional(v.string()),
    // Token ids (lowercased) to rebase; defaults to the set that gained live coverage after launch.
    tokens: v.optional(v.array(v.string())),
    // Pagination for the all-wallets sweep.
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { wallet, tokens, cursor, batchSize },
  ): Promise<{
    scope: "wallet" | "all"
    wallet?: string
    scanned: number
    rebased: number
    isDone: boolean
    continueCursor: string | null
  }> => {
    const now = Date.now()
    const targetTokens = new Set((tokens ?? DEFAULT_STALE_BASIS_TOKENS).map((token) => token.toLowerCase()))
    let scanned = 0
    let rebased = 0

    const applyProfile = async (profile: Doc<"sandboxProfiles">) => {
      const basket = profile.basketSnapshot
      if (!basket || basket.length === 0) return
      let changed = false
      const nextBasket = [...basket]
      for (let index = 0; index < nextBasket.length; index++) {
        const leg = nextBasket[index]
        const tokenId = leg.tokenId.toLowerCase()
        if (!targetTokens.has(tokenId)) continue
        scanned++
        const live = await validatedTokenPriceUsd(ctx, tokenId, now)
        if (!live || !(live > 0)) continue
        const fixtureBasis = SANDBOX_TOKEN_PRICE_USD[tokenId] ?? 1
        const isStaleFixture =
          leg.priceUsdAtClaim > 0 && Math.abs(leg.priceUsdAtClaim - fixtureBasis) <= fixtureBasis * 1e-3
        if (!isStaleFixture) continue
        // Already at the live basis (idempotent re-run, or fixture coincidentally equals live).
        if (Math.abs(live - leg.priceUsdAtClaim) <= leg.priceUsdAtClaim * 1e-6) continue
        nextBasket[index] = { ...leg, priceUsdAtClaim: live }
        changed = true
        rebased++
      }
      if (changed) await ctx.db.patch(profile._id, { basketSnapshot: nextBasket })
    }

    if (wallet) {
      const profile = await ctx.db
        .query("sandboxProfiles")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet.toLowerCase()))
        .unique()
      if (profile) await applyProfile(profile)
      return { scope: "wallet", wallet, scanned, rebased, isDone: true, continueCursor: null }
    }

    const page = await ctx.db.query("sandboxProfiles").paginate({ cursor: cursor ?? null, numItems: batchSize ?? 200 })
    for (const profile of page.page) await applyProfile(profile)
    return { scope: "all", scanned, rebased, isDone: page.isDone, continueCursor: page.continueCursor }
  },
})
