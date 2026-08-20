import { createThread, listUIMessages, saveMessage } from "@convex-dev/agent"
import { RateLimiter } from "@convex-dev/rate-limiter"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { components } from "./_generated/api"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { ASK_AI_DOMAIN_REJECTION, ASK_AI_WALLET_REQUIRED } from "../app/lib/ask-ai/config"
import { classifyAskAIDomain, isAskAIGreeting } from "../app/lib/ask-ai/domain-gate"
import { answerFromAskAIKnowledge, rankAskAIKnowledge } from "../app/lib/ask-ai/knowledge"
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

export const messages = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireOwnedThread(ctx, args.threadId)
    const [result, richRows] = await Promise.all([
      listUIMessages(ctx, components.agent, args),
      ctx.db
        .query("askAIMessageParts")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .collect(),
    ])
    const richByMessage = new Map(richRows.map((row) => [row.messageId, row.parts]))
    return { ...result, page: result.page.map((message) => ({ ...message, richParts: richByMessage.get(message.id) })) }
  },
})

export const quota = query({
  args: {},
  handler: async (ctx) => {
    const ownerSubject = await requireOwnerSubject(ctx)
    const current = await askAIRateLimiter.getValue(ctx, "perSubjectDaily", { key: ownerSubject })
    const limit = 20
    const remaining = Math.max(0, Math.min(limit, Math.floor(current.value)))
    return {
      used: limit - remaining,
      limit,
      resetsAt: current.ts + 24 * 60 * 60 * 1_000,
    }
  },
})

export const beginTurn = mutation({
  args: { threadId: v.string(), prompt: v.string() },
  handler: async (ctx, { threadId, prompt }) => {
    const { ownerSubject, thread } = await requireOwnedThread(ctx, threadId)
    if (thread.status !== "active") throw new Error("Thread is archived")
    await askAIRateLimiter.limit(ctx, "perSubjectDaily", { key: ownerSubject, throws: true })
    await askAIRateLimiter.limit(ctx, "perSubjectBurst", { key: ownerSubject, throws: true })
    await askAIRateLimiter.limit(ctx, "globalDaily", { throws: true })
    const text = prompt.trim()
    if (!text || text.length > 2_000) throw new Error("Message must contain 1 to 2000 characters")
    const domain = classifyAskAIDomain(text)
    const saved = await saveMessage(ctx, components.agent, {
      threadId,
      userId: ownerSubject,
      prompt: text,
    })
    if (thread.title === "New Chat") {
      await ctx.db.patch(thread._id, { title: titleFromPrompt(text), updatedAt: Date.now() })
    }
    let response = ASK_AI_DOMAIN_REJECTION
    let toolName: "domain_guard" | "portfolio" | "knowledge" | "market_data" = "domain_guard"
    let retrievalChunks: Array<{ id: string; source: string; locator: string; score: number; text: string }> = []
    let sources: Array<{ domain: string; title: string; url?: string }> = []
    let visual: { type: "chart"; label: string; value: string; points: number[]; delta?: string } | undefined
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
        } else if (domain.intent === "risk") {
          const cooling = engines.umbrella.filter((position) => position.status !== "active").length
          response = `Current engine risk: Credit Engine health factor ${engines.borrow?.healthFactor?.toFixed(2) ?? "unavailable"}; ${engines.multiply.length} Multiply position${engines.multiply.length === 1 ? "" : "s"}; and ${cooling} Umbrella position${cooling === 1 ? "" : "s"} outside active status. Data is persisted and read-only.`
        } else {
          response = `I found your current Avana balances: Lend ${usd(portfolio.totals.lendUsd)}, Borrow ${usd(portfolio.totals.borrowUsd)}, Multiply ${usd(portfolio.totals.multiplyUsd)}, Umbrella ${usd(portfolio.totals.umbrellaUsd)}, and liquid funds ${usd(portfolio.totals.liquidUsd)}. Engine detail includes ${engines.lend.length} Lend, ${engines.multiply.length} Multiply, and ${engines.umbrella.length} Umbrella position${engines.umbrella.length === 1 ? "" : "s"}. I did not submit a transaction.`
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
        const [knowledge, marketSnapshots] = await Promise.all([
          ctx.db.query("askAIKnowledge").collect(),
          shouldReadMarket
            ? readAskAIMarketSnapshots(ctx, { sources: sourcesForAskAIPrompt(text), kind: marketKind, limit: 5 })
            : Promise.resolve([]),
        ])
        const knowledgeAnswer = answerFromAskAIKnowledge(rankAskAIKnowledge(knowledge, text))
        const marketAnswer = answerFromAskAIMarketSnapshots(marketSnapshots)
        const rankedKnowledge = rankAskAIKnowledge(knowledge, text)
        retrievalChunks = rankedKnowledge.map((chunk, index) => ({
          id: chunk.key,
          source: chunk.title,
          locator: "Avana knowledge",
          score: Math.max(0.72, 0.96 - index * 0.06),
          text: chunk.content,
        }))
        sources = rankedKnowledge.map((chunk) => ({
          domain: chunk.sourceUrl ? new URL(chunk.sourceUrl).hostname : "Avana knowledge",
          title: chunk.title,
          ...(chunk.sourceUrl ? { url: chunk.sourceUrl } : {}),
        }))
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
        } else if (retrievalChunks.length > 0) {
          toolName = "knowledge"
        }
        response =
          [marketAnswer, knowledgeAnswer].filter((section): section is string => Boolean(section)).join("\n\n") ||
          (isAskAIGreeting(text)
            ? "Good to see you. I can help you understand Avana markets, LP collateral, lending, borrowing, Multiply positions, Umbrella, and portfolio risk. What would you like to look at?"
            : `I don't have verified live data for that ${domain.category.replaceAll("_", " ")} question yet. I can still explain how it works in Avana, or you can ask about a supported market, LP position, lending position, or risk scenario.`)
      }
    }
    if (thread.title !== "New Chat") await ctx.db.patch(thread._id, { updatedAt: Date.now() })
    return {
      ...saved,
      domain,
      fallbackResponse: response,
      grounding: response,
      tool: {
        name: toolName,
        query: text,
        request: domain.intent.replaceAll("_", " "),
        result:
          toolName === "knowledge"
            ? `${retrievalChunks.length} relevant knowledge chunk${retrievalChunks.length === 1 ? "" : "s"}`
            : toolName === "market_data"
              ? "Cached market data and knowledge retrieved"
              : toolName === "portfolio"
                ? "Persisted wallet and engine data read"
                : domain.allowed
                  ? "Request accepted"
                  : "Request outside supported scope",
      },
      retrievalChunks,
      sources,
      visual,
    }
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
    await ctx.db.patch(thread._id, { updatedAt: Date.now() })
    return saved
  },
})

export const archive = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const { thread } = await requireOwnedThread(ctx, threadId)
    await ctx.db.patch(thread._id, { status: "archived", updatedAt: Date.now() })
  },
})
