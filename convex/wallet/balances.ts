/**
 * Wallet token balances — feeds the dashboard "Wallet" tab, the sidebar amount
 * pickers, and every action page's "Available" line. Mirrors the
 * app/lib/swap-system/contracts.ts UserAssetBalance shape.
 *
 * Reads are wallet-scoped and gated by requireSandboxWallet (i.e. the auth
 * subject must control the requested wallet). No public reads — a wallet's
 * holdings are not public data.
 */

import { v } from "convex/values"
import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { internalMutation, mutation, query } from "../_generated/server"
import { requireSandboxWallet } from "../sandbox/auth"

const sourceType = v.union(v.literal("wallet"), v.literal("position"))
const assetKind = v.union(v.literal("wallet"), v.literal("lp"), v.literal("returned-lp"))

export type WalletBalanceUpsertRow = {
  wallet: string
  assetId: string
  amount: number
  sourceType: "wallet" | "position"
  sourcePositionId?: Id<"positions">
  assetKind?: "wallet" | "lp" | "returned-lp"
  symbol?: string
  valueUsd6?: string
}

/** Shared upsert used by internalMutation + sandbox write paths (claim, swap). */
export async function upsertWalletBalanceRows(ctx: MutationCtx, rows: WalletBalanceUpsertRow[]) {
  const now = Date.now()
  for (const row of rows) {
    const existing = await ctx.db
      .query("walletBalances")
      .withIndex("by_wallet_asset", (q) => q.eq("wallet", row.wallet).eq("assetId", row.assetId))
      .collect()
    const match = existing.find(
      (candidate) => candidate.sourceType === row.sourceType && candidate.sourcePositionId === row.sourcePositionId,
    )
    if (match) {
      await ctx.db.patch(match._id, {
        amount: row.amount,
        assetKind: row.assetKind,
        symbol: row.symbol,
        valueUsd6: row.valueUsd6,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert("walletBalances", { ...row, updatedAt: now })
    }
  }
  return { written: rows.length }
}

/**
 * Wallet's own balances across all assets + sources.
 *
 * `assetKind` filter (optional) narrows the return set to a single shape —
 * "wallet" for token holdings, "lp" for LP-token collateral, "returned-lp" for
 * pending withdrawal queue. Omit to get everything. Home + action pages use
 * the filter so they don't page over irrelevant rows.
 */
export const listBalances = query({
  args: { wallet: v.string(), assetKind: v.optional(assetKind) },
  handler: async (ctx, { wallet, assetKind: kindFilter }) => {
    const authed = await requireSandboxWallet(ctx, wallet)
    const rows =
      kindFilter !== undefined
        ? await ctx.db
            .query("walletBalances")
            .withIndex("by_wallet_asset_kind", (q) => q.eq("wallet", authed).eq("assetKind", kindFilter))
            .collect()
        : await ctx.db
            .query("walletBalances")
            .withIndex("by_wallet", (q) => q.eq("wallet", authed))
            .collect()
    return rows.map((row) => ({
      id: `${row.wallet}:${row.assetId}:${row.sourceType}${row.sourcePositionId ? `:${row.sourcePositionId}` : ""}`,
      walletId: row.wallet,
      assetId: row.assetId,
      amount: row.amount,
      sourceType: row.sourceType,
      sourcePositionId: row.sourcePositionId,
      assetKind: row.assetKind,
      symbol: row.symbol,
      valueUsd6: row.valueUsd6,
    }))
  },
})

/**
 * Upsert a batch of wallet balances. Internal-only so anonymous callers can't
 * mint tokens for a wallet they don't control — the caller (seed writer, position
 * upsert path) is trusted. Keyed by (wallet, assetId, sourceType, sourcePositionId).
 */
export const upsertBalances = internalMutation({
  args: {
    rows: v.array(
      v.object({
        wallet: v.string(),
        assetId: v.string(),
        amount: v.number(),
        sourceType,
        sourcePositionId: v.optional(v.id("positions")),
        assetKind: v.optional(assetKind),
        symbol: v.optional(v.string()),
        valueUsd6: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { rows }) => upsertWalletBalanceRows(ctx, rows),
})

/**
 * Delete a wallet's balance rows. Used when reseeding a dev wallet or when a
 * position closes — leaving stale $0 rows around is a rendering foot-gun.
 */
export const deleteBalances = internalMutation({
  args: { wallet: v.string(), positionId: v.optional(v.id("positions")) },
  handler: async (ctx, { wallet, positionId }) => {
    const rows = await ctx.db
      .query("walletBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect()
    let deleted = 0
    for (const row of rows) {
      if (positionId !== undefined && row.sourcePositionId !== positionId) continue
      await ctx.db.delete(row._id)
      deleted += 1
    }
    return { deleted }
  },
})

/**
 * Open-gate / fresh wallet helper: if the wallet has no liquid rows yet, seed a
 * small practice basket into both sandboxBalances and walletBalances so swap +
 * dashboard Wallet tab have a durable Convex source of truth.
 */
const OPEN_GATE_STARTER: Array<{
  assetId: string
  symbol: string
  amount: number
  priceUsd: number
  assetKind: "wallet" | "lp"
}> = [
  { assetId: "eth", symbol: "ETH", amount: 0.012, priceUsd: 1934, assetKind: "wallet" },
  { assetId: "usdc", symbol: "USDC", amount: 840, priceUsd: 1, assetKind: "wallet" },
  { assetId: "link", symbol: "LINK", amount: 24, priceUsd: 18, assetKind: "wallet" },
  { assetId: "eth-usdc-lp", symbol: "ETH-USDC LP", amount: 6.4, priceUsd: 125, assetKind: "lp" },
]

export const ensureLiquidBalances = mutation({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const existingSandbox = await ctx.db
      .query("sandboxBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .first()
    const existingWallet = await ctx.db
      .query("walletBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .first()
    if (existingSandbox || existingWallet) {
      return { seeded: false as const }
    }

    const now = Date.now()
    const upsertRows: WalletBalanceUpsertRow[] = []
    for (const leg of OPEN_GATE_STARTER) {
      const valueUsd = leg.amount * leg.priceUsd
      await ctx.db.insert("sandboxBalances", {
        wallet,
        assetSlug: leg.assetId,
        symbol: leg.symbol,
        amount: leg.amount,
        valueUsd,
        priceUsd: leg.priceUsd,
        updatedAt: now,
      })
      upsertRows.push({
        wallet,
        assetId: leg.assetId,
        amount: leg.amount,
        sourceType: "wallet",
        assetKind: leg.assetKind,
        symbol: leg.symbol,
        valueUsd6: String(Math.round(valueUsd * 1_000_000)),
      })
    }
    await upsertWalletBalanceRows(ctx, upsertRows)
    return { seeded: true as const, count: OPEN_GATE_STARTER.length }
  },
})
