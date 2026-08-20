import { createThread, listUIMessages, saveMessage } from "@convex-dev/agent"
import { RateLimiter } from "@convex-dev/rate-limiter"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { components } from "./_generated/api"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { ASK_AI_DOMAIN_REJECTION } from "../app/lib/ask-ai/config"
import { classifyAskAIDomain } from "../app/lib/ask-ai/domain-gate"
import { readAskAIPortfolio } from "./askAITools"

type AskAICtx = QueryCtx | MutationCtx

const askAIRateLimiter = new RateLimiter(components.rateLimiter, {
  perSubjectDaily: { kind: "fixed window", rate: 20, period: 24 * 60 * 60 * 1_000 },
  perSubjectBurst: { kind: "token bucket", rate: 1, period: 5_000, capacity: 1 },
  globalDaily: { kind: "fixed window", rate: 20_000, period: 24 * 60 * 60 * 1_000 },
})

function usd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value)
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
    return await listUIMessages(ctx, components.agent, args)
  },
})

export const addUserMessage = mutation({
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
    let response = ASK_AI_DOMAIN_REJECTION
    if (domain.allowed) {
      if (["position", "risk", "borrow_simulation", "stress_test"].includes(domain.intent)) {
        const portfolio = await readAskAIPortfolio(ctx)
        response = portfolio.walletRequired
          ? portfolio.message
          : `I found your current Avana balances: Lend ${usd(portfolio.totals.lendUsd)}, Borrow ${usd(portfolio.totals.borrowUsd)}, Multiply ${usd(portfolio.totals.multiplyUsd)}, Umbrella ${usd(portfolio.totals.umbrellaUsd)}, and liquid funds ${usd(portfolio.totals.liquidUsd)}. I only read persisted wallet data; I did not submit a transaction.`
      } else {
        response = `I can help with this ${domain.category.replaceAll("_", " ")} question. The mock provider is active, so I will use Avana's persisted data and seeded knowledge without making an external market-data call.`
      }
    }
    await saveMessage(ctx, components.agent, {
      threadId,
      userId: ownerSubject,
      promptMessageId: saved.messageId,
      message: { role: "assistant", content: response },
    })
    await ctx.db.patch(thread._id, { updatedAt: Date.now() })
    return { ...saved, domain }
  },
})

export const archive = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const { thread } = await requireOwnedThread(ctx, threadId)
    await ctx.db.patch(thread._id, { status: "archived", updatedAt: Date.now() })
  },
})
