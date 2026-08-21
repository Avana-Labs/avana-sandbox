import {
  abortStream,
  createThread,
  listMessages,
  listStreams,
  listUIMessages,
  saveMessage,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent"
import { RateLimiter, isRateLimitError } from "@convex-dev/rate-limiter"
import { paginationOptsValidator } from "convex/server"
import { ConvexError, v, type GenericId } from "convex/values"
import { components } from "./_generated/api"
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { ASK_AI_CONFIG } from "../app/lib/ask-ai/config"
import { classifyAskAIDomain } from "../app/lib/ask-ai/domain-gate"

type AskAICtx = QueryCtx | MutationCtx

const askAIRateLimiter = new RateLimiter(components.rateLimiter, {
  perSubjectDaily: { kind: "fixed window", rate: 20, period: 24 * 60 * 60 * 1_000 },
  perSubjectBurst: { kind: "token bucket", rate: 1, period: 5_000, capacity: 1 },
  globalDaily: { kind: "fixed window", rate: 20_000, period: 24 * 60 * 60 * 1_000 },
  // Shared, cross-instance cap on minting NEW guest identities per client IP.
  // Backs the /api/ask-ai/session route so clearing the guest cookie can't yield
  // an unlimited supply of fresh quotas across serverless instances.
  guestMintPerIp: { kind: "fixed window", rate: 30, period: 60 * 60 * 1_000 },
})

// User-facing throws use ConvexError so the friendly message survives Convex's
// production error redaction and Lane C can render error.data.message with a
// code -> copy fallback map. See docs/ask-ai-lane-contracts.md §2.
type AskAIErrorCode = "ASK_AI_GENERATION_FAILED" | "ASK_AI_RATE_LIMITED" | "ASK_AI_UNAVAILABLE"

function askAIError(code: AskAIErrorCode, message: string): ConvexError<{ code: AskAIErrorCode; message: string }> {
  return new ConvexError({ code, message })
}

// The rate limiter throws its own ConvexError ({ kind: "RateLimited", ... }).
// Re-map it to the shared Ask AI error shape so the client sees a friendly,
// redaction-safe message instead of the raw limiter payload.
async function enforceAskAIRateLimit<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (isRateLimitError(error))
      throw askAIError(
        "ASK_AI_RATE_LIMITED",
        "Ask AI is handling a lot of requests right now. Please wait a moment and try again.",
      )
    throw error
  }
}

function titleFromPrompt(prompt: string) {
  const compact = prompt
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[?.!]+$/, "")
  if (compact.length <= 44) return compact
  const shortened = compact
    .slice(0, 44)
    .replace(/\s+\S*$/, "")
    .trim()
  return `${shortened || compact.slice(0, 44)}…`
}

async function requireOwnerSubject(ctx: AskAICtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity?.subject) throw new Error("Ask AI session required")
  return identity.subject
}

async function requireOwnedThread(ctx: AskAICtx, threadId: string) {
  const ownerSubject = await requireOwnerSubject(ctx)
  const thread = await ctx.db
    .query("askAIThreads")
    .withIndex("by_thread", (q) => q.eq("threadId", threadId))
    .unique()
  if (!thread || thread.ownerSubject !== ownerSubject) throw new Error("Thread not found")
  return { ownerSubject, thread }
}

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const ownerSubject = await requireOwnerSubject(ctx)
    const title = "New Chat"
    const threadId = await createThread(ctx, components.agent, { userId: ownerSubject, title })
    const now = Date.now()
    await ctx.db.insert("askAIThreads", {
      threadId,
      ownerSubject,
      title,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    return { threadId, title, createdAt: now, updatedAt: now }
  },
})

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, { includeArchived }) => {
    const ownerSubject = await requireOwnerSubject(ctx)
    if (includeArchived) {
      const rows = await ctx.db.query("askAIThreads").collect()
      return rows.filter((row) => row.ownerSubject === ownerSubject).sort((a, b) => b.updatedAt - a.updatedAt)
    }
    return await ctx.db
      .query("askAIThreads")
      .withIndex("by_owner_status_updated", (q) => q.eq("ownerSubject", ownerSubject).eq("status", "active"))
      .order("desc")
      .collect()
  },
})

export const listPage = query({
  args: {
    status: v.union(v.literal("active"), v.literal("archived")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { status, paginationOpts }) => {
    const ownerSubject = await requireOwnerSubject(ctx)
    return await ctx.db
      .query("askAIThreads")
      .withIndex("by_owner_status_updated", (q) => q.eq("ownerSubject", ownerSubject).eq("status", status))
      .order("desc")
      .paginate(paginationOpts)
  },
})

export const messages = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator, streamArgs: vStreamArgs },
  handler: async (ctx, args) => {
    await requireOwnedThread(ctx, args.threadId)
    const [result, richRows, streams] = await Promise.all([
      listUIMessages(ctx, components.agent, args),
      ctx.db
        .query("askAIMessageParts")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .collect(),
      syncStreams(ctx, components.agent, args),
    ])
    const richByMessage = new Map(richRows.map((row) => [row.messageId, row.parts]))
    return {
      ...result,
      page: result.page.map((message) => ({ ...message, richParts: richByMessage.get(message.id) })),
      streams,
    }
  },
})

export const quota = query({
  args: {},
  handler: async (ctx) => {
    const ownerSubject = await requireOwnerSubject(ctx)
    const current = await askAIRateLimiter.getValue(ctx, "perSubjectDaily", { key: ownerSubject })
    const limit = 20
    const remaining = Math.max(0, Math.min(limit, Math.floor(current.value)))
    const dayStart = Date.now() - 24 * 60 * 60 * 1_000
    const usageRows = await ctx.db
      .query("askAIUsage")
      .withIndex("by_owner_created", (q) => q.eq("ownerSubject", ownerSubject).gte("createdAt", dayStart))
      .collect()
    const tokensUsed = usageRows.reduce((sum, row) => sum + row.totalTokens, 0)
    return {
      used: limit - remaining,
      limit,
      resetsAt: current.ts + 24 * 60 * 60 * 1_000,
      tokensUsed,
      tokenLimit: ASK_AI_CONFIG.limits.dailyTokenBudget,
      tokensRemaining: Math.max(0, ASK_AI_CONFIG.limits.dailyTokenBudget - tokensUsed),
    }
  },
})

// Shared, cross-instance guest-mint throttle used by /api/ask-ai/session. The
// route is pre-auth, so no identity is required. `ip` is derived server-side by
// the route; passing a forged ip only spends that key's own budget and cannot
// mint a JWT (minting stays in the route), so a public mutation is safe here.
export const recordGuestMint = mutation({
  args: { ip: v.string() },
  handler: async (ctx, { ip }) => {
    const key = (ip || "unknown").slice(0, 100)
    const result = await askAIRateLimiter.limit(ctx, "guestMintPerIp", { key })
    return { ok: result.ok, retryAfterMs: Math.max(0, Math.ceil(result.retryAfter ?? 0)) }
  },
})

export const beginTurn = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    retryPromptMessageId: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("askAIAttachments"))),
    routing: v.optional(
      v.object({
        allowed: v.boolean(),
        category: v.union(
          v.literal("avana"),
          v.literal("lp_collateral"),
          v.literal("defi_lending"),
          v.literal("crypto_market"),
          v.literal("dex_pool"),
          v.literal("aave"),
          v.literal("position_risk"),
          v.literal("protocol_education"),
          v.literal("unsupported"),
        ),
        intent: v.union(
          v.literal("position"),
          v.literal("market"),
          v.literal("pool"),
          v.literal("borrow_simulation"),
          v.literal("stress_test"),
          v.literal("comparison"),
          v.literal("education"),
          v.literal("risk"),
          v.literal("unsupported"),
        ),
        confidence: v.number(),
      }),
    ),
  },
  handler: async (ctx, { threadId, prompt, retryPromptMessageId, attachmentIds, routing }) => {
    const { ownerSubject, thread } = await requireOwnedThread(ctx, threadId)
    if (thread.status !== "active") throw new Error("Thread is archived")
    const text = prompt.trim()
    if (!text || text.length > 2_000)
      throw askAIError("ASK_AI_GENERATION_FAILED", "Message must contain 1 to 2000 characters")
    const domain = routing ?? classifyAskAIDomain(text)
    const previousTurn = retryPromptMessageId
      ? await ctx.db
          .query("askAITurns")
          .withIndex("by_prompt_message", (q) => q.eq("promptMessageId", retryPromptMessageId))
          .unique()
      : null
    if (
      retryPromptMessageId &&
      (!previousTurn ||
        previousTurn.ownerSubject !== ownerSubject ||
        previousTurn.threadId !== threadId ||
        previousTurn.prompt !== text ||
        previousTurn.status === "complete" ||
        previousTurn.status === "cancelled")
    )
      throw new Error("This turn cannot be retried")
    if (!previousTurn) {
      const dayStart = Date.now() - 24 * 60 * 60 * 1_000
      const usageRows = await ctx.db
        .query("askAIUsage")
        .withIndex("by_owner_created", (q) => q.eq("ownerSubject", ownerSubject).gte("createdAt", dayStart))
        .collect()
      if (usageRows.reduce((sum, row) => sum + row.totalTokens, 0) >= ASK_AI_CONFIG.limits.dailyTokenBudget)
        throw askAIError("ASK_AI_RATE_LIMITED", "Ask AI daily token limit reached. Need help? Contact Avana Support.")
      await enforceAskAIRateLimit(() =>
        askAIRateLimiter.limit(ctx, "perSubjectDaily", { key: ownerSubject, throws: true }),
      )
      await enforceAskAIRateLimit(() =>
        askAIRateLimiter.limit(ctx, "perSubjectBurst", { key: ownerSubject, throws: true }),
      )
      await enforceAskAIRateLimit(() => askAIRateLimiter.limit(ctx, "globalDaily", { throws: true }))
    }
    const attachments = previousTurn
      ? []
      : await Promise.all((attachmentIds ?? []).slice(0, 5).map((attachmentId) => ctx.db.get(attachmentId)))
    if (
      attachments.some(
        (attachment) =>
          !attachment ||
          attachment.ownerSubject !== ownerSubject ||
          attachment.threadId !== threadId ||
          attachment.status !== "processed" ||
          !attachment.agentFileId,
      )
    )
      throw new Error("An attachment is unavailable or still processing")
    const saved = previousTurn
      ? { messageId: previousTurn.promptMessageId }
      : await saveMessage(ctx, components.agent, {
          threadId,
          userId: ownerSubject,
          prompt: text,
          metadata: {
            fileIds: attachments.flatMap((attachment) => (attachment?.agentFileId ? [attachment.agentFileId] : [])),
          },
        })
    const now = Date.now()
    if (previousTurn) await ctx.db.patch(previousTurn._id, { status: "running", updatedAt: now })
    else
      await ctx.db.insert("askAITurns", {
        threadId,
        ownerSubject,
        promptMessageId: saved.messageId,
        prompt: text,
        status: "running",
        createdAt: now,
        updatedAt: now,
      })
    if (thread.title === "New Chat") {
      await ctx.db.patch(thread._id, { title: titleFromPrompt(text), updatedAt: Date.now() })
    }
    if (thread.title !== "New Chat") await ctx.db.patch(thread._id, { updatedAt: Date.now() })
    return {
      ...saved,
      ownerSubject,
      domain,
    }
  },
})

export const enqueueTurn = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    attachmentIds: v.optional(v.array(v.id("askAIAttachments"))),
  },
  handler: async (ctx, { threadId, prompt, attachmentIds }) => {
    const { ownerSubject, thread } = await requireOwnedThread(ctx, threadId)
    if (thread.status !== "active") throw new Error("Thread is archived")
    const text = prompt.trim()
    if (!text || text.length > ASK_AI_CONFIG.maxInputCharacters)
      throw askAIError(
        "ASK_AI_GENERATION_FAILED",
        `Message must contain 1 to ${ASK_AI_CONFIG.maxInputCharacters} characters`,
      )
    const queued = await ctx.db
      .query("askAITurns")
      .withIndex("by_thread_status_created", (q) => q.eq("threadId", threadId).eq("status", "queued"))
      .collect()
    if (queued.length >= 10) throw askAIError("ASK_AI_RATE_LIMITED", "Ask AI queue is full")
    const dayStart = Date.now() - 24 * 60 * 60 * 1_000
    const usageRows = await ctx.db
      .query("askAIUsage")
      .withIndex("by_owner_created", (q) => q.eq("ownerSubject", ownerSubject).gte("createdAt", dayStart))
      .collect()
    if (usageRows.reduce((sum, row) => sum + row.totalTokens, 0) >= ASK_AI_CONFIG.limits.dailyTokenBudget)
      throw askAIError("ASK_AI_RATE_LIMITED", "Ask AI daily token limit reached. Need help? Contact Avana Support.")
    await enforceAskAIRateLimit(() =>
      askAIRateLimiter.limit(ctx, "perSubjectDaily", { key: ownerSubject, throws: true }),
    )
    const attachments = await Promise.all(
      (attachmentIds ?? []).slice(0, 5).map((attachmentId) => ctx.db.get(attachmentId)),
    )
    if (
      attachments.some(
        (attachment) =>
          !attachment ||
          attachment.ownerSubject !== ownerSubject ||
          attachment.threadId !== threadId ||
          attachment.status !== "processed" ||
          !attachment.agentFileId,
      )
    )
      throw new Error("An attachment is unavailable or still processing")
    const saved = await saveMessage(ctx, components.agent, {
      threadId,
      userId: ownerSubject,
      prompt: text,
      metadata: {
        fileIds: attachments.flatMap((attachment) => (attachment?.agentFileId ? [attachment.agentFileId] : [])),
      },
    })
    const now = Date.now()
    const turnId = await ctx.db.insert("askAITurns", {
      threadId,
      ownerSubject,
      promptMessageId: saved.messageId,
      prompt: text,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    })
    if (thread.title === "New Chat") await ctx.db.patch(thread._id, { title: titleFromPrompt(text), updatedAt: now })
    return { turnId, promptMessageId: saved.messageId }
  },
})

export const turnQueue = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    await requireOwnedThread(ctx, threadId)
    const rows = await ctx.db.query("askAITurns").withIndex("by_owner_updated").order("asc").collect()
    return rows
      .filter((row) => row.threadId === threadId && ["queued", "running", "failed"].includes(row.status))
      .map((row) => ({ id: row._id, promptMessageId: row.promptMessageId, prompt: row.prompt, status: row.status }))
  },
})

export const cancelQueuedTurn = mutation({
  args: { turnId: v.id("askAITurns") },
  handler: async (ctx, { turnId }) => {
    const turn = await ctx.db.get(turnId)
    if (!turn) return
    const ownerSubject = await requireOwnerSubject(ctx)
    if (turn.ownerSubject !== ownerSubject) throw new Error("Ask AI turn not found")
    if (turn.status !== "queued") throw new Error("Only queued turns can be cancelled")
    await ctx.db.patch(turnId, { status: "cancelled", updatedAt: Date.now() })
  },
})

export const retryFailedTurn = mutation({
  args: { turnId: v.id("askAITurns") },
  handler: async (ctx, { turnId }) => {
    const turn = await ctx.db.get(turnId)
    if (!turn) throw new Error("Ask AI turn not found")
    const ownerSubject = await requireOwnerSubject(ctx)
    if (turn.ownerSubject !== ownerSubject || turn.status !== "failed") throw new Error("Ask AI turn cannot be retried")
    await ctx.db.patch(turnId, { status: "queued", updatedAt: Date.now() })
  },
})

export const cancelRunningTurn = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const { ownerSubject } = await requireOwnedThread(ctx, threadId)
    const running = await ctx.db
      .query("askAITurns")
      .withIndex("by_thread_status_created", (q) => q.eq("threadId", threadId).eq("status", "running"))
      .first()
    if (!running || running.ownerSubject !== ownerSubject) return false
    const streams = await listStreams(ctx, components.agent, { threadId, includeStatuses: ["streaming"] })
    await Promise.all(
      streams.map((stream) =>
        abortStream(ctx, components.agent, { streamId: stream.streamId, reason: "Cancelled by user" }),
      ),
    )
    await ctx.db.patch(running._id, { status: "cancelled", updatedAt: Date.now() })
    return true
  },
})

export const completeGeneratedTurn = internalMutation({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    assistantMessageId: v.string(),
    usage: v.object({ inputTokens: v.number(), outputTokens: v.number(), totalTokens: v.number() }),
    // Explicit shape (was v.any()) per docs/ask-ai-lane-contracts.md §1 so the
    // rich parts the UI renders are validated at the trust boundary.
    richParts: v.optional(
      v.object({
        sources: v.optional(
          v.array(
            v.object({
              domain: v.string(),
              title: v.string(),
              locator: v.string(),
              url: v.optional(v.string()),
              kind: v.optional(v.string()),
              version: v.optional(v.string()),
            }),
          ),
        ),
        usage: v.optional(v.object({ inputTokens: v.number(), outputTokens: v.number(), totalTokens: v.number() })),
        financialResults: v.optional(
          v.array(
            v.object({
              kind: v.union(
                v.literal("portfolio"),
                v.literal("borrow_capacity"),
                v.literal("position_risk"),
                v.literal("simulate_borrow"),
                v.literal("stress_position"),
              ),
              // Supplied by Lane D on the tool result; optional until it ships.
              dataProvenance: v.optional(
                v.union(v.literal("sandbox"), v.literal("connected_wallet"), v.literal("onchain")),
              ),
              // The tool's structured result verbatim; genuinely arbitrary shape.
              payload: v.any(),
            }),
          ),
        ),
        retrievalChunks: v.optional(
          v.array(
            v.object({
              title: v.string(),
              locator: v.string(),
              text: v.string(),
              score: v.optional(v.number()),
            }),
          ),
        ),
      }),
    ),
  },
  handler: async (ctx, { threadId, promptMessageId, assistantMessageId, usage, richParts }) => {
    const { ownerSubject, thread } = await requireOwnedThread(ctx, threadId)
    const turn = await ctx.db
      .query("askAITurns")
      .withIndex("by_prompt_message", (q) => q.eq("promptMessageId", promptMessageId))
      .unique()
    if (!turn || turn.ownerSubject !== ownerSubject || turn.threadId !== threadId)
      throw new Error("Ask AI turn not found")
    // The user cancelled while the stream was finishing. cancelRunningTurn already
    // set the terminal status and aborted the stream; do not resurrect it as a
    // completed answer. Mirrors the guard in failTurn.
    if (turn.status === "cancelled") return
    const existingParts = await ctx.db
      .query("askAIMessageParts")
      .withIndex("by_message", (q) => q.eq("messageId", assistantMessageId))
      .unique()
    if (richParts && !existingParts)
      await ctx.db.insert("askAIMessageParts", {
        threadId,
        messageId: assistantMessageId,
        parts: richParts,
        createdAt: Date.now(),
      })
    const existingUsage = await ctx.db
      .query("askAIUsage")
      .withIndex("by_message", (q) => q.eq("messageId", assistantMessageId))
      .unique()
    if (!existingUsage)
      await ctx.db.insert("askAIUsage", {
        ownerSubject,
        threadId,
        messageId: assistantMessageId,
        model: ASK_AI_CONFIG.defaultModel,
        provider: "openai",
        ...usage,
        createdAt: Date.now(),
      })
    const now = Date.now()
    await ctx.db.patch(turn._id, { status: "complete", updatedAt: now })
    await ctx.db.patch(thread._id, { updatedAt: now })
  },
})

// No client caller (grep of app/ finds none); server-only, so lock it down.
export const completeTurn = internalMutation({
  args: { threadId: v.string(), promptMessageId: v.string(), message: v.string(), richParts: v.optional(v.any()) },
  handler: async (ctx, { threadId, promptMessageId, message, richParts }) => {
    const { ownerSubject, thread } = await requireOwnedThread(ctx, threadId)
    const text = message.trim()
    if (!text || text.length > 20_000) throw new Error("Assistant message must contain 1 to 20000 characters")
    const saved = await saveMessage(ctx, components.agent, {
      threadId,
      userId: ownerSubject,
      promptMessageId,
      message: { role: "assistant", content: text },
    })
    if (richParts) {
      await ctx.db.insert("askAIMessageParts", {
        threadId,
        messageId: saved.messageId,
        parts: richParts,
        createdAt: Date.now(),
      })
    }
    const turn = await ctx.db
      .query("askAITurns")
      .withIndex("by_prompt_message", (q) => q.eq("promptMessageId", promptMessageId))
      .unique()
    if (turn && turn.ownerSubject === ownerSubject && turn.threadId === threadId)
      await ctx.db.patch(turn._id, { status: "complete", updatedAt: Date.now() })
    await ctx.db.patch(thread._id, { updatedAt: Date.now() })
    return saved
  },
})

// On a failed turn, saveStreamDeltas can leave a partial or empty assistant
// message persisted that the list query would otherwise return as a normal,
// complete answer — so Lane C would show Copy / feedback controls beside an
// error card. Remove any assistant message for this thread that never settled
// (status !== "success") or has no visible text. Robust when none exists.
// See docs/ask-ai-lane-contracts.md §3.
async function discardStrayAssistantMessage(ctx: MutationCtx, threadId: string) {
  const { page } = await listMessages(ctx, components.agent, {
    threadId,
    excludeToolMessages: true,
    paginationOpts: { cursor: null, numItems: 20 },
  })
  const stale: GenericId<"messages">[] = []
  for (const message of page) {
    if (message.message?.role !== "assistant") continue
    const settled = message.status === "success" && (message.text ?? "").trim().length > 0
    if (!settled) stale.push(message._id as GenericId<"messages">)
  }
  if (stale.length > 0) await ctx.runMutation(components.agent.messages.deleteByIds, { messageIds: stale })
}

export const failTurn = internalMutation({
  args: { threadId: v.string(), promptMessageId: v.string() },
  handler: async (ctx, { threadId, promptMessageId }) => {
    const { ownerSubject } = await requireOwnedThread(ctx, threadId)
    const turn = await ctx.db
      .query("askAITurns")
      .withIndex("by_prompt_message", (q) => q.eq("promptMessageId", promptMessageId))
      .unique()
    if (!turn || turn.ownerSubject !== ownerSubject || turn.threadId !== threadId) return
    if (turn.status === "cancelled") return
    await ctx.db.patch(turn._id, { status: "failed", updatedAt: Date.now() })
    await discardStrayAssistantMessage(ctx, threadId)
  },
})

const FEEDBACK_CATEGORIES = [
  "Helpful",
  "Incorrect",
  "Outdated data",
  "Not helpful",
  "Missing context",
  "Unsafe",
  "Other",
]

export const submitFeedback = mutation({
  args: { threadId: v.string(), messageId: v.string(), categories: v.array(v.string()), note: v.optional(v.string()) },
  handler: async (ctx, { threadId, messageId, categories, note }) => {
    const { ownerSubject } = await requireOwnedThread(ctx, threadId)
    const messageParts = await ctx.db
      .query("askAIMessageParts")
      .withIndex("by_message", (q) => q.eq("messageId", messageId))
      .unique()
    if (!messageParts || messageParts.threadId !== threadId) throw new Error("Assistant message not found")
    const cleanCategories = [...new Set(categories)].filter((category) => FEEDBACK_CATEGORIES.includes(category))
    const cleanNote = note?.trim().slice(0, 1_000) || undefined
    if (cleanCategories.length === 0 && !cleanNote) throw new Error("Choose a reason or add a note")
    const existing = await ctx.db
      .query("askAIFeedback")
      .withIndex("by_owner_message", (q) => q.eq("ownerSubject", ownerSubject).eq("messageId", messageId))
      .unique()
    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, { categories: cleanCategories, note: cleanNote, updatedAt: now })
      return existing._id
    }
    return await ctx.db.insert("askAIFeedback", {
      ownerSubject,
      threadId,
      messageId,
      categories: cleanCategories,
      note: cleanNote,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const feedbackReport = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query("askAIFeedback")
      .withIndex("by_created_at")
      .order("desc")
      .take(Math.min(limit ?? 100, 500))
    const categories = Object.fromEntries(FEEDBACK_CATEGORIES.map((category) => [category, 0]))
    const daily: Record<string, number> = {}
    for (const row of rows)
      for (const category of row.categories) categories[category] = (categories[category] ?? 0) + 1
    for (const row of rows) {
      const day = new Date(row.createdAt).toISOString().slice(0, 10)
      daily[day] = (daily[day] ?? 0) + 1
    }
    const enrichedRows = await Promise.all(
      rows.map(async (row) => {
        const [thread, usage] = await Promise.all([
          ctx.db
            .query("askAIThreads")
            .withIndex("by_thread", (q) => q.eq("threadId", row.threadId))
            .unique(),
          ctx.db
            .query("askAIUsage")
            .withIndex("by_message", (q) => q.eq("messageId", row.messageId))
            .unique(),
        ])
        return {
          ...row,
          threadTitle: thread?.title ?? "Deleted thread",
          model: usage?.model,
          provider: usage?.provider,
          totalTokens: usage?.totalTokens,
        }
      }),
    )
    return { total: rows.length, categories, daily, rows: enrichedRows }
  },
})

export const archive = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const { thread } = await requireOwnedThread(ctx, threadId)
    await ctx.db.patch(thread._id, { status: "archived", updatedAt: Date.now() })
  },
})

function cleanThreadTitle(value: string) {
  const title = value
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!title || title.length > 80) throw new Error("Thread title must contain 1 to 80 characters")
  return title
}

export const rename = mutation({
  args: { threadId: v.string(), title: v.string() },
  handler: async (ctx, { threadId, title }) => {
    const { thread } = await requireOwnedThread(ctx, threadId)
    const nextTitle = cleanThreadTitle(title)
    await ctx.db.patch(thread._id, { title: nextTitle, updatedAt: Date.now() })
    return { threadId, title: nextTitle }
  },
})

export const unarchive = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const { thread } = await requireOwnedThread(ctx, threadId)
    await ctx.db.patch(thread._id, { status: "active", updatedAt: Date.now() })
  },
})
