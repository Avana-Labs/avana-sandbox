import { createThread, listUIMessages, saveMessage, syncStreams, vStreamArgs } from "@convex-dev/agent"
import { RateLimiter } from "@convex-dev/rate-limiter"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { components } from "./_generated/api"
import { internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { ASK_AI_CONFIG, ASK_AI_DOMAIN_REJECTION, ASK_AI_WALLET_REQUIRED } from "../app/lib/ask-ai/config"
import { classifyAskAIDomain, isAskAIClarificationPrompt, isAskAIGreeting } from "../app/lib/ask-ai/domain-gate"
import { answerFromAskAIMarketSnapshots, sourcesForAskAIPrompt } from "../app/lib/ask-ai/market-context"
import { readAskAIEngineSnapshot, readAskAIMarketSnapshots, readAskAIPortfolio } from "./askAITools"

type AskAICtx = QueryCtx | MutationCtx

const askAIRateLimiter = new RateLimiter(components.rateLimiter, {
  perSubjectDaily: { kind: "fixed window", rate: 20, period: 24 * 60 * 60 * 1_000 },
  perSubjectBurst: { kind: "token bucket", rate: 1, period: 5_000, capacity: 1 },
  globalDaily: { kind: "fixed window", rate: 20_000, period: 24 * 60 * 60 * 1_000 },
})

function usd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value)
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

export const beginTurn = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    retryPromptMessageId: v.optional(v.string()),
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
  handler: async (ctx, { threadId, prompt, retryPromptMessageId, routing }) => {
    const { ownerSubject, thread } = await requireOwnedThread(ctx, threadId)
    if (thread.status !== "active") throw new Error("Thread is archived")
    const text = prompt.trim()
    if (!text || text.length > 2_000) throw new Error("Message must contain 1 to 2000 characters")
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
        previousTurn.status === "complete")
    )
      throw new Error("This turn cannot be retried")
    if (!previousTurn) {
      const dayStart = Date.now() - 24 * 60 * 60 * 1_000
      const usageRows = await ctx.db
        .query("askAIUsage")
        .withIndex("by_owner_created", (q) => q.eq("ownerSubject", ownerSubject).gte("createdAt", dayStart))
        .collect()
      if (usageRows.reduce((sum, row) => sum + row.totalTokens, 0) >= ASK_AI_CONFIG.limits.dailyTokenBudget)
        throw new Error("Ask AI daily token limit reached. Need help? Contact Avana Support.")
      await askAIRateLimiter.limit(ctx, "perSubjectDaily", { key: ownerSubject, throws: true })
      await askAIRateLimiter.limit(ctx, "perSubjectBurst", { key: ownerSubject, throws: true })
      await askAIRateLimiter.limit(ctx, "globalDaily", { throws: true })
    }
    const saved = previousTurn
      ? { messageId: previousTurn.promptMessageId }
      : await saveMessage(ctx, components.agent, {
          threadId,
          userId: ownerSubject,
          prompt: text,
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
    let response = ASK_AI_DOMAIN_REJECTION
    let toolName: "portfolio" | "market_data" | null = null
    const retrievalChunks: Array<{ id: string; source: string; locator: string; score: number; text: string }> = []
    const sources: Array<{ domain: string; title: string; url?: string }> = []
    let visual: { type: "chart"; label: string; value: string; points: number[]; delta?: string } | undefined
    let financialResult:
      | {
          kind: "portfolio" | "borrow_capacity" | "position_risk" | "market" | "pool"
          title: string
          asOf?: number
          freshness?: "fresh" | "stale" | "unavailable"
          metrics: Array<{ label: string; value: string; after?: string }>
        }
      | undefined
    if (domain.allowed) {
      if (["position", "risk", "borrow_simulation", "stress_test"].includes(domain.intent)) {
        toolName = "portfolio"
        const [portfolio, engines] = await Promise.all([
          readAskAIPortfolio(ctx),
          readAskAIEngineSnapshot(ctx, { multiplyShockPct: -20, lendProjectionDays: 30 }),
        ])
        if (portfolio.walletRequired || engines.walletRequired) {
          response = ASK_AI_WALLET_REQUIRED
        } else if (domain.intent === "borrow_simulation") {
          if (engines.borrow)
            financialResult = {
              kind: "borrow_capacity",
              title: "Borrow capacity",
              asOf: engines.borrow.at,
              metrics: [
                { label: "Available to borrow", value: usd(engines.borrow.availableBorrowCapacityUsd) },
                { label: "Currently borrowed", value: usd(engines.borrow.totalBorrowedUsd) },
                { label: "Health factor", value: engines.borrow.healthFactor?.toFixed(2) ?? "Not applicable" },
              ],
            }
          response = engines.borrow
            ? `Your Credit Engine snapshot shows ${usd(engines.borrow.availableBorrowCapacityUsd)} available to borrow, ${usd(engines.borrow.totalBorrowedUsd)} currently borrowed, and health factor ${engines.borrow.healthFactor?.toFixed(2) ?? "not applicable"}. This is read-only; no borrow was submitted.`
            : "Your wallet has no Credit Engine risk snapshot yet, so borrowing capacity is unavailable."
        } else if (domain.intent === "stress_test") {
          const stressedHealth = engines.multiply
            .map((position) => position.stress?.healthFactor)
            .filter((value): value is number => typeof value === "number")
          response = stressedHealth.length
            ? `With the requested default 20% collateral-price shock, the Multiply Engine's lowest projected health factor is ${Math.min(...stressedHealth).toFixed(2)} across ${stressedHealth.length} modeled position${stressedHealth.length === 1 ? "" : "s"}. Borrow stress remains unavailable unless the prompt supplies a supported collateral shock mapped to a Credit Engine position.`
            : "No Multiply position had complete risk parameters for the 20% stress calculation. I did not invent missing liquidation thresholds."
          if (stressedHealth.length)
            financialResult = {
              kind: "position_risk",
              title: "Collateral stress test",
              asOf: engines.asOf,
              metrics: [
                { label: "Collateral shock", value: "−20%" },
                { label: "Lowest projected health factor", value: Math.min(...stressedHealth).toFixed(2) },
                { label: "Positions modeled", value: String(stressedHealth.length) },
              ],
            }
        } else if (domain.intent === "risk") {
          const cooling = engines.umbrella.filter((position) => position.status !== "active").length
          response = `Current engine risk: Credit Engine health factor ${engines.borrow?.healthFactor?.toFixed(2) ?? "unavailable"}; ${engines.multiply.length} Multiply position${engines.multiply.length === 1 ? "" : "s"}; and ${cooling} Umbrella position${cooling === 1 ? "" : "s"} outside active status. Data is persisted and read-only.`
          financialResult = {
            kind: "position_risk",
            title: "Position risk",
            asOf: engines.asOf,
            metrics: [
              { label: "Credit Engine health factor", value: engines.borrow?.healthFactor?.toFixed(2) ?? "Unavailable" },
              { label: "Multiply positions", value: String(engines.multiply.length) },
              { label: "Umbrella positions requiring attention", value: String(cooling) },
            ],
          }
        } else {
          response = `I found your current Avana balances: Lend ${usd(portfolio.totals.lendUsd)}, Borrow ${usd(portfolio.totals.borrowUsd)}, Multiply ${usd(portfolio.totals.multiplyUsd)}, Umbrella ${usd(portfolio.totals.umbrellaUsd)}, and liquid funds ${usd(portfolio.totals.liquidUsd)}. Engine detail includes ${engines.lend.length} Lend, ${engines.multiply.length} Multiply, and ${engines.umbrella.length} Umbrella position${engines.umbrella.length === 1 ? "" : "s"}. I did not submit a transaction.`
          financialResult = {
            kind: "portfolio",
            title: "Avana portfolio",
            asOf: portfolio.asOf,
            metrics: [
              { label: "Lend", value: usd(portfolio.totals.lendUsd) },
              { label: "Borrow", value: usd(portfolio.totals.borrowUsd) },
              { label: "Multiply", value: usd(portfolio.totals.multiplyUsd) },
              { label: "Umbrella", value: usd(portfolio.totals.umbrellaUsd) },
              { label: "Liquid funds", value: usd(portfolio.totals.liquidUsd) },
            ],
          }
        }
      } else {
        const marketKind =
          domain.intent === "pool"
            ? ("dex_pool" as const)
            : domain.category === "aave"
              ? ("lending_market" as const)
              : domain.intent === "market"
                ? ("token_price" as const)
                : undefined
        const shouldReadMarket = ["market", "pool", "comparison"].includes(domain.intent)
        const marketSnapshots = shouldReadMarket
          ? await readAskAIMarketSnapshots(ctx, { sources: sourcesForAskAIPrompt(text), kind: marketKind, limit: 5 })
          : []
        const marketAnswer = answerFromAskAIMarketSnapshots(marketSnapshots)
        if (marketSnapshots.length > 0) {
          toolName = "market_data"
          const prices = marketSnapshots.flatMap((snapshot) => {
            const value = snapshot.payload.usd ?? snapshot.payload.price ?? snapshot.payload.totalLiquidity
            const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
            return Number.isFinite(number) ? [number] : []
          })
          if (prices.length > 0) {
            visual = {
              type: "chart",
              label: marketSnapshots[0]?.key ?? "Market data",
              value: usd(prices.at(-1) ?? 0),
              points: prices,
            }
          }
          const latest = marketSnapshots[0]
          if (latest) {
            const at = latest.sourceUpdatedAt ?? latest.fetchedAt
            const staleAfter = latest.kind === "dex_pool" ? 30 * 60 * 1_000 : 20 * 60 * 1_000
            const metrics = Object.entries(latest.payload)
              .filter(([, value]) => typeof value === "number" || typeof value === "string")
              .slice(0, 6)
              .map(([label, value]) => ({ label: label.replace(/([A-Z])/g, " $1").trim(), value: String(value) }))
            financialResult = {
              kind: latest.kind === "dex_pool" ? "pool" : "market",
              title: latest.key,
              asOf: at,
              freshness: Date.now() - at <= staleAfter ? "fresh" : "stale",
              metrics,
            }
          }
        }
        response =
          marketAnswer ||
          (isAskAIGreeting(text)
            ? "Good to see you. I can help you understand Avana markets, LP collateral, lending, borrowing, Multiply positions, Umbrella, and portfolio risk. What would you like to look at?"
            : isAskAIClarificationPrompt(text)
              ? "What would you like me to clarify: your balance summary, a specific position, or liquidation risk?"
              : "Use the authoritative Avana knowledge search and relevant read-only tools to answer this request.")
      }
    }
    if (thread.title !== "New Chat") await ctx.db.patch(thread._id, { updatedAt: Date.now() })
    return {
      ...saved,
      ownerSubject,
      domain,
      fallbackResponse: response,
      grounding: response,
      tool: toolName
        ? {
            name: toolName,
            query: text,
            request: domain.intent.replaceAll("_", " "),
            result:
              toolName === "market_data"
                ? "Cached market data retrieved"
                : "Persisted wallet and engine data read",
          }
        : null,
      retrievalChunks,
      sources,
      visual,
      financialResult,
    }
  },
})

export const completeGeneratedTurn = mutation({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    assistantMessageId: v.string(),
    usage: v.object({ inputTokens: v.number(), outputTokens: v.number(), totalTokens: v.number() }),
    richParts: v.optional(v.any()),
  },
  handler: async (ctx, { threadId, promptMessageId, assistantMessageId, usage, richParts }) => {
    const { ownerSubject, thread } = await requireOwnedThread(ctx, threadId)
    const turn = await ctx.db
      .query("askAITurns")
      .withIndex("by_prompt_message", (q) => q.eq("promptMessageId", promptMessageId))
      .unique()
    if (!turn || turn.ownerSubject !== ownerSubject || turn.threadId !== threadId)
      throw new Error("Ask AI turn not found")
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

export const completeTurn = mutation({
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

export const failTurn = mutation({
  args: { threadId: v.string(), promptMessageId: v.string() },
  handler: async (ctx, { threadId, promptMessageId }) => {
    const { ownerSubject } = await requireOwnedThread(ctx, threadId)
    const turn = await ctx.db
      .query("askAITurns")
      .withIndex("by_prompt_message", (q) => q.eq("promptMessageId", promptMessageId))
      .unique()
    if (!turn || turn.ownerSubject !== ownerSubject || turn.threadId !== threadId) return
    await ctx.db.patch(turn._id, { status: "failed", updatedAt: Date.now() })
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
          ctx.db.query("askAIThreads").withIndex("by_thread", (q) => q.eq("threadId", row.threadId)).unique(),
          ctx.db.query("askAIUsage").withIndex("by_message", (q) => q.eq("messageId", row.messageId)).unique(),
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
  const title = value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim()
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
