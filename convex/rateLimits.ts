import { v } from "convex/values"
import { mutation } from "./_generated/server"

/**
 * Atomically consume one hit from the (key, windowMs) bucket. Convex mutations are
 * serializable — concurrent callers with the same key retry on write conflict — so
 * this is a correct shared counter across Next server instances. Returns whether the
 * hit was allowed and how many remain in the current window.
 */
export const consume = mutation({
  args: {
    key: v.string(),
    limit: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, { key, limit, windowMs }) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("rateLimitBuckets")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique()

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs
      if (existing) {
        await ctx.db.patch(existing._id, { count: 1, resetAt })
      } else {
        await ctx.db.insert("rateLimitBuckets", { key, count: 1, resetAt })
      }
      return { allowed: true, remaining: Math.max(0, limit - 1), resetAt }
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt }
    }

    const nextCount = existing.count + 1
    await ctx.db.patch(existing._id, { count: nextCount })
    return { allowed: true, remaining: Math.max(0, limit - nextCount), resetAt: existing.resetAt }
  },
})
