/**
 * Support Center persistence. Every request submitted from the Support Center
 * form is written here so the team has a durable, queryable record. This is a
 * public mutation (a user may submit while signed out); the wallet/email are
 * captured opportunistically when available. Inputs are validated and clamped
 * server-side — never trust client-supplied lengths.
 */

import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const MESSAGE_MIN = 10
const MESSAGE_MAX = 5000
const FIELD_MAX = 200

function clamp(value: string, max: number) {
  return value.trim().slice(0, max)
}

export const submitSupportRequest = mutation({
  args: {
    category: v.string(),
    categoryLabel: v.optional(v.string()),
    topic: v.string(),
    topicLabel: v.optional(v.string()),
    message: v.string(),
    wallet: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = args.message.trim()
    if (message.length < MESSAGE_MIN) {
      throw new Error(`Please describe the issue in at least ${MESSAGE_MIN} characters.`)
    }
    const category = clamp(args.category, FIELD_MAX)
    const topic = clamp(args.topic, FIELD_MAX)
    if (!category || !topic) {
      throw new Error("Choose a category and topic before sending.")
    }

    const id = await ctx.db.insert("supportRequests", {
      wallet: args.wallet?.toLowerCase() || undefined,
      userEmail: args.userEmail?.trim() || undefined,
      category,
      categoryLabel: args.categoryLabel ? clamp(args.categoryLabel, FIELD_MAX) : undefined,
      topic,
      topicLabel: args.topicLabel ? clamp(args.topicLabel, FIELD_MAX) : undefined,
      message: message.slice(0, MESSAGE_MAX),
      status: "new",
      userAgent: args.userAgent ? clamp(args.userAgent, FIELD_MAX) : undefined,
      createdAt: Date.now(),
    })

    return { id: String(id) }
  },
})

/** Most-recent support requests (newest first). For an internal triage view. */
export const listRecentSupportRequests = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const take = Math.min(Math.max(limit ?? 50, 1), 200)
    return await ctx.db.query("supportRequests").withIndex("by_created_at").order("desc").take(take)
  },
})
