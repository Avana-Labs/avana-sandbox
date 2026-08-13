/**
 * Contract-address lookups for pool / asset / multiply detail pages. Seeded
 * with the current FNV-hashed synthetic 0x… strings (`contractAddressFor`),
 * `isSynthetic: true` today; an Etherscan sync flips them to real addresses
 * later with `isSynthetic: false` and no UI change.
 *
 * Split into three modules — one per scope — but co-located here so the seed
 * writer can populate all three from a single import path.
 */

import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"

const baseFields = {
  salt: v.string(),
  address: v.string(),
  label: v.string(),
  href: v.string(),
  chain: v.string(),
  isSynthetic: v.boolean(),
}

const poolAddressRow = v.object({ poolSlug: v.string(), ...baseFields })
const assetAddressRow = v.object({ assetSlug: v.string(), ...baseFields })
const multiplyAddressRow = v.object({ marketSlug: v.string(), ...baseFields })

const stripMeta = <T extends { _id: unknown; _creationTime: unknown; updatedAt: unknown }>(row: T) => {
  const { _id: _mid, _creationTime: _mct, updatedAt: _mua, ...rest } = row
  return rest
}

// -----------------------------------------------------------------------------
// Pool
// -----------------------------------------------------------------------------

export const listPoolAddresses = query({
  args: { poolSlug: v.string() },
  handler: async (ctx, { poolSlug }) => {
    const rows = await ctx.db
      .query("poolContractAddresses")
      .withIndex("by_pool", (q) => q.eq("poolSlug", poolSlug))
      .collect()
    return rows.map(stripMeta)
  },
})

export const upsertPoolAddresses = internalMutation({
  args: { rows: v.array(poolAddressRow) },
  handler: async (ctx, { rows }) => {
    const now = Date.now()
    for (const row of rows) {
      const existing = await ctx.db
        .query("poolContractAddresses")
        .withIndex("by_pool_salt", (q) => q.eq("poolSlug", row.poolSlug).eq("salt", row.salt))
        .unique()
      if (existing) await ctx.db.patch(existing._id, { ...row, updatedAt: now })
      else await ctx.db.insert("poolContractAddresses", { ...row, updatedAt: now })
    }
    return { written: rows.length }
  },
})

// -----------------------------------------------------------------------------
// Asset
// -----------------------------------------------------------------------------

export const listAssetAddresses = query({
  args: { assetSlug: v.string() },
  handler: async (ctx, { assetSlug }) => {
    const rows = await ctx.db
      .query("assetContractAddresses")
      .withIndex("by_asset", (q) => q.eq("assetSlug", assetSlug))
      .collect()
    return rows.map(stripMeta)
  },
})

export const upsertAssetAddresses = internalMutation({
  args: { rows: v.array(assetAddressRow) },
  handler: async (ctx, { rows }) => {
    const now = Date.now()
    for (const row of rows) {
      const existing = await ctx.db
        .query("assetContractAddresses")
        .withIndex("by_asset_salt", (q) => q.eq("assetSlug", row.assetSlug).eq("salt", row.salt))
        .unique()
      if (existing) await ctx.db.patch(existing._id, { ...row, updatedAt: now })
      else await ctx.db.insert("assetContractAddresses", { ...row, updatedAt: now })
    }
    return { written: rows.length }
  },
})

// -----------------------------------------------------------------------------
// Multiply market
// -----------------------------------------------------------------------------

export const listMultiplyAddresses = query({
  args: { marketSlug: v.string() },
  handler: async (ctx, { marketSlug }) => {
    const rows = await ctx.db
      .query("multiplyContractAddresses")
      .withIndex("by_market", (q) => q.eq("marketSlug", marketSlug))
      .collect()
    return rows.map(stripMeta)
  },
})

export const upsertMultiplyAddresses = internalMutation({
  args: { rows: v.array(multiplyAddressRow) },
  handler: async (ctx, { rows }) => {
    const now = Date.now()
    for (const row of rows) {
      const existing = await ctx.db
        .query("multiplyContractAddresses")
        .withIndex("by_market_salt", (q) => q.eq("marketSlug", row.marketSlug).eq("salt", row.salt))
        .unique()
      if (existing) await ctx.db.patch(existing._id, { ...row, updatedAt: now })
      else await ctx.db.insert("multiplyContractAddresses", { ...row, updatedAt: now })
    }
    return { written: rows.length }
  },
})
