import { v } from "convex/values"
import { internalMutation } from "./_generated/server"

/**
 * Audits or deletes one bounded page of deprecated Ask AI attachments.
 * Deletion requires execute=true; omitted/false is always a read-only dry run.
 * This mutation is operator-only and is never called by application code.
 */
export const cleanupAttachmentPage = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
    execute: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("askAIAttachments").paginate({
      cursor: args.cursor ?? null,
      numItems: Math.min(Math.max(Math.trunc(args.batchSize ?? 100), 1), 250),
    })
    let deleted = 0
    if (args.execute === true) {
      for (const attachment of page.page) {
        await ctx.storage.delete(attachment.storageId)
        await ctx.db.delete(attachment._id)
        deleted++
      }
    }
    return {
      matched: page.page.length,
      deleted,
      dryRun: args.execute !== true,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    }
  },
})
