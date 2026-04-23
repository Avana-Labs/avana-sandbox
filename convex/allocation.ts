/**
 * Allocation queries — powers `AllocationBreakdownCard` on the asset page.
 *
 * Reads from `assetPoolAllocationDaily` joined to `markets` (for pool display
 * names). Returns shape: `AllocationRow[]` in `app/lib/borrow-detail/types.ts`.
 */

import { v } from "convex/values"
import { query } from "./_generated/server"

/**
 * Latest allocation snapshot per pool for a given asset.
 */
export const getForAsset = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const asset = await ctx.db
      .query("markets")
      .withIndex("by_scope_slug", (q) => q.eq("scope", "asset").eq("slug", slug))
      .unique()
    if (!asset) return []

    const today = new Date().toISOString().slice(0, 10)
    const rows = await ctx.db
      .query("assetPoolAllocationDaily")
      .withIndex("by_asset_day", (q) => q.eq("assetId", asset._id).lte("day", today))
      .order("desc")
      .take(64)

    const latestByPool = new Map<string, typeof rows[number]>()
    for (const row of rows) {
      if (!latestByPool.has(row.poolId)) latestByPool.set(row.poolId, row)
    }

    const out = await Promise.all(
      [...latestByPool.values()].map(async (row) => {
        const pool = await ctx.db.get(row.poolId)
        if (!pool) return null
        return {
          id: String(row.poolId),
          poolName: pool.name,
          venueLabel: pool.venueLabel ?? "",
          visuals: [] as unknown as [unknown, unknown],
          sharePct: row.sharePct,
          valueUsd: row.valueUsd,
          utilizationPct: row.utilizationPct,
          borrowAprPct: row.borrowAprPct,
        }
      }),
    )
    return out.filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) => b.sharePct - a.sharePct)
  },
})
