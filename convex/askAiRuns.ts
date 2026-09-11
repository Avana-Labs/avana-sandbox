import { v } from "convex/values"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { ASK_AI_WIDGET_TYPES, type AskAiWidget } from "../app/lib/ask-ai/widgets"

/**
 * Persistence for Ask AI mode-runs (Phase 2).
 *
 * A run is the typed unit the deterministic modes produce: mode + the single snapshot
 * it was computed on + typed widgets + typed actions. Storing it here (instead of
 * scattering financial results across askAIMessageParts.parts) makes an answer
 * reproducible, testable, and attributable for feedback. Nothing calls these yet.
 */

async function requireOwnerSubject(ctx: Pick<QueryCtx | MutationCtx, "auth">): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity?.subject) throw new Error("Ask AI session required")
  return identity.subject
}

const WIDGET_TYPES = new Set<string>(ASK_AI_WIDGET_TYPES)

// Widgets are stored structurally (v.any()) but are produced only by the typed engine
// builders. Guard the discriminant at the write boundary so a malformed widget can
// never be persisted, without the drift risk of a hand-maintained Convex union.
function assertWidgetShape(widgets: readonly unknown[]): asserts widgets is AskAiWidget[] {
  for (const widget of widgets) {
    const type = (widget as { type?: unknown } | null)?.type
    if (typeof type !== "string" || !WIDGET_TYPES.has(type))
      throw new Error(`Unknown Ask AI widget type: ${String(type)}`)
  }
}

const modeValidator = v.union(v.literal("risk"), v.literal("returns"), v.literal("stress"))

export const record = mutation({
  args: {
    threadId: v.optional(v.string()),
    messageId: v.optional(v.string()),
    mode: modeValidator,
    queryText: v.string(),
    snapshotId: v.string(),
    asOf: v.number(),
    narrative: v.string(),
    widgets: v.array(v.any()),
    actions: v.array(v.any()),
    provenance: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerSubject = await requireOwnerSubject(ctx)
    assertWidgetShape(args.widgets)
    return ctx.db.insert("askAiRuns", {
      ownerSubject,
      threadId: args.threadId,
      messageId: args.messageId,
      mode: args.mode,
      queryText: args.queryText,
      snapshotId: args.snapshotId,
      asOf: args.asOf,
      narrative: args.narrative,
      widgets: args.widgets,
      actions: args.actions,
      provenance: args.provenance,
      createdAt: Date.now(),
    })
  },
})

export const get = query({
  args: { runId: v.id("askAiRuns") },
  handler: async (ctx, { runId }) => {
    const ownerSubject = await requireOwnerSubject(ctx)
    const run = await ctx.db.get(runId)
    if (!run || run.ownerSubject !== ownerSubject) return null
    return run
  },
})

export const listByThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const ownerSubject = await requireOwnerSubject(ctx)
    const runs = await ctx.db
      .query("askAiRuns")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect()
    return runs.filter((run) => run.ownerSubject === ownerSubject)
  },
})
