import { v } from "convex/values"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { internalMutation } from "../_generated/server"

type SessionCtx = QueryCtx | MutationCtx
type SessionWrite = {
  wallet: string
  authSubject?: string
  seedVersion: number
  seededAt?: number
  lastSeenAt: number
  umbrellaSeeded?: boolean
}

export async function readWalletSessionWithLegacyFallback(ctx: SessionCtx, wallet: string) {
  const current = await ctx.db
    .query("walletSessions")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .unique()
  if (current) return current
  return ctx.db
    .query("sandboxSessions")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .unique()
}

/** Temporary dual-write used only during the table-name migration window. */
export async function upsertWalletSessionWithLegacyMirror(ctx: MutationCtx, session: SessionWrite) {
  const [current, legacy] = await Promise.all([
    ctx.db
      .query("walletSessions")
      .withIndex("by_wallet", (q) => q.eq("wallet", session.wallet))
      .unique(),
    ctx.db
      .query("sandboxSessions")
      .withIndex("by_wallet", (q) => q.eq("wallet", session.wallet))
      .unique(),
  ])
  if (current) await ctx.db.patch(current._id, session)
  else await ctx.db.insert("walletSessions", session)
  if (legacy) await ctx.db.patch(legacy._id, session)
  else await ctx.db.insert("sandboxSessions", session)
}

/** Idempotent release migration. Application code never invokes this automatically. */
export const migrateSandboxSessions = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("sandboxSessions")
      .paginate({ cursor: args.cursor ?? null, numItems: Math.min(Math.max(args.batchSize ?? 200, 1), 500) })
    let migrated = 0
    let skippedExisting = 0
    for (const source of page.page) {
      const existing = await ctx.db
        .query("walletSessions")
        .withIndex("by_wallet", (q) => q.eq("wallet", source.wallet))
        .unique()
      if (existing) {
        skippedExisting++
        continue
      }
      await ctx.db.insert("walletSessions", {
        wallet: source.wallet,
        authSubject: source.authSubject,
        seedVersion: source.seedVersion,
        seededAt: source.seededAt,
        lastSeenAt: source.lastSeenAt,
        umbrellaSeeded: source.umbrellaSeeded,
      })
      migrated++
    }
    return {
      scanned: page.page.length,
      migrated,
      skippedExisting,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    }
  },
})
