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
import { internalMutation, query } from "../_generated/server"
import { requireSandboxWallet } from "../sandbox/auth"

const sourceType = v.union(v.literal("wallet"), v.literal("position"))
const assetKind = v.union(v.literal("wallet"), v.literal("lp"), v.literal("returned-lp"))

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
  handler: async (ctx, { rows }) => {
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
  },
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
