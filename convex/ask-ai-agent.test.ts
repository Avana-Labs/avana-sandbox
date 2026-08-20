// @vitest-environment edge-runtime
import { register as registerAgent } from "@convex-dev/agent/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { describe, expect, test } from "vitest"
import { api, internal } from "./_generated/api"
import { convexTest } from "convex-test"
import schema from "./schema"
import { ASK_AI_CONFIG } from "../app/lib/ask-ai/config"

const modules = import.meta.glob("./**/*.*s")

function askAITest() {
  const t = convexTest(schema, modules)
  registerAgent(t)
  registerRateLimiter(t)
  return t
}

describe("Ask AI generated-turn lifecycle", () => {
  test("persists queued turns and allows the owner to cancel before execution", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:queue-owner" })
    const thread = await owner.mutation(api.askAI.create, {})
    const first = await owner.mutation(api.askAI.enqueueTurn, { threadId: thread.threadId, prompt: "First question" })
    await owner.mutation(api.askAI.enqueueTurn, { threadId: thread.threadId, prompt: "Second question" })

    await expect(owner.query(api.askAI.turnQueue, { threadId: thread.threadId })).resolves.toMatchObject([
      { prompt: "First question", status: "queued" },
      { prompt: "Second question", status: "queued" },
    ])
    const row = await t.run(async (ctx) =>
      ctx.db
        .query("askAITurns")
        .withIndex("by_prompt_message", (q) => q.eq("promptMessageId", first.promptMessageId))
        .unique(),
    )
    await owner.mutation(api.askAI.cancelQueuedTurn, { turnId: row!._id })
    await expect(owner.query(api.askAI.turnQueue, { threadId: thread.threadId })).resolves.toMatchObject([
      { prompt: "Second question", status: "queued" },
    ])
  })

  test("only the thread owner can settle an Agent response", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:owner" })
    const other = t.withIdentity({ subject: "ask-guest:other" })
    const thread = await owner.mutation(api.askAI.create, {})
    const turn = await owner.mutation(api.askAI.beginTurn, { threadId: thread.threadId, prompt: "Hello" })

    await expect(
      other.mutation(internal.askAI.completeGeneratedTurn, {
        threadId: thread.threadId,
        promptMessageId: turn.messageId,
        assistantMessageId: "message:fake",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      }),
    ).rejects.toThrow("Thread not found")
  })

  test("beginTurn persists input but fabricates no assistant response", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:no-canned-answer" })
    const thread = await owner.mutation(api.askAI.create, {})
    const turn = await owner.mutation(api.askAI.beginTurn, {
      threadId: thread.threadId,
      prompt: "What is my liquidation risk?",
    })

    expect(turn).not.toHaveProperty("fallbackResponse")
    expect(turn).not.toHaveProperty("grounding")
    expect(turn).not.toHaveProperty("financialResult")
    expect(turn).toMatchObject({ ownerSubject: "ask-guest:no-canned-answer" })
  })

  test("message queries accept stream cursors before a stream exists", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:stream-owner" })
    const thread = await owner.mutation(api.askAI.create, {})

    await expect(
      owner.query(api.askAI.messages, {
        threadId: thread.threadId,
        paginationOpts: { cursor: null, numItems: 20 },
      }),
    ).resolves.toMatchObject({ page: [], isDone: true })
  })

  test("cancels a running turn without converting it to a retryable failure", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:cancel-owner" })
    const thread = await owner.mutation(api.askAI.create, {})
    const turn = await owner.mutation(api.askAI.beginTurn, { threadId: thread.threadId, prompt: "Analyze risk" })

    await expect(owner.mutation(api.askAI.cancelRunningTurn, { threadId: thread.threadId })).resolves.toBe(true)
    await owner.mutation(internal.askAI.failTurn, { threadId: thread.threadId, promptMessageId: turn.messageId })
    await expect(owner.query(api.askAI.turnQueue, { threadId: thread.threadId })).resolves.toEqual([])
  })

  test("rejects an empty prompt with a typed, user-safe ConvexError", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:validation" })
    const thread = await owner.mutation(api.askAI.create, {})

    await expect(
      owner.mutation(api.askAI.beginTurn, { threadId: thread.threadId, prompt: "   " }),
    ).rejects.toMatchObject({
      data: { code: "ASK_AI_GENERATION_FAILED", message: "Message must contain 1 to 2000 characters" },
    })
  })

  test("maps a tripped rate limiter to a typed ASK_AI_RATE_LIMITED error", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:burst" })
    const thread = await owner.mutation(api.askAI.create, {})
    await owner.mutation(api.askAI.beginTurn, { threadId: thread.threadId, prompt: "First question" })

    await expect(
      owner.mutation(api.askAI.beginTurn, { threadId: thread.threadId, prompt: "Second question" }),
    ).rejects.toMatchObject({ data: { code: "ASK_AI_RATE_LIMITED" } })
  })

  test("persists financial results and retrieval chunks as validated rich parts", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:rich" })
    const thread = await owner.mutation(api.askAI.create, {})
    const turn = await owner.mutation(api.askAI.beginTurn, { threadId: thread.threadId, prompt: "What is my risk?" })

    await owner.mutation(internal.askAI.completeGeneratedTurn, {
      threadId: thread.threadId,
      promptMessageId: turn.messageId,
      assistantMessageId: "message:rich",
      usage: { inputTokens: 5, outputTokens: 7, totalTokens: 12 },
      richParts: {
        sources: [{ domain: "avana", title: "Docs", locator: "L1" }],
        usage: { inputTokens: 5, outputTokens: 7, totalTokens: 12 },
        financialResults: [{ kind: "portfolio", dataProvenance: "sandbox", payload: { netValueUsd: 100 } }],
        retrievalChunks: [{ title: "Docs", locator: "L1", text: "How Avana values LP collateral", score: 0.91 }],
      },
    })

    const parts = await t.run((ctx) =>
      ctx.db
        .query("askAIMessageParts")
        .withIndex("by_message", (q) => q.eq("messageId", "message:rich"))
        .unique(),
    )
    expect(parts?.parts).toMatchObject({
      financialResults: [{ kind: "portfolio", dataProvenance: "sandbox", payload: { netValueUsd: 100 } }],
      retrievalChunks: [{ title: "Docs", locator: "L1", text: "How Avana values LP collateral", score: 0.91 }],
    })
  })

  test("reports provider token usage from durable records", async () => {
    const t = askAITest()
    const ownerSubject = "ask-guest:usage-owner"
    await t.run(async (ctx) => {
      await ctx.db.insert("askAIUsage", {
        ownerSubject,
        threadId: "thread-usage",
        messageId: "message-usage",
        model: "gpt-5.6-luna",
        provider: "openai",
        inputTokens: 120,
        outputTokens: 30,
        totalTokens: 150,
        createdAt: Date.now(),
      })
    })

    await expect(t.withIdentity({ subject: ownerSubject }).query(api.askAI.quota, {})).resolves.toMatchObject({
      tokensUsed: 150,
      tokenLimit: ASK_AI_CONFIG.limits.dailyTokenBudget,
      tokensRemaining: ASK_AI_CONFIG.limits.dailyTokenBudget - 150,
    })
  })
})
