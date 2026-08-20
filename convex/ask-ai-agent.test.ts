// @vitest-environment edge-runtime
import { register as registerAgent } from "@convex-dev/agent/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { describe, expect, test } from "vitest"
import { api } from "./_generated/api"
import { convexTest } from "convex-test"
import schema from "./schema"

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
      other.mutation(api.askAI.completeGeneratedTurn, {
        threadId: thread.threadId,
        promptMessageId: turn.messageId,
        assistantMessageId: "message:fake",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      }),
    ).rejects.toThrow("Thread not found")
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
      tokenLimit: 30_000,
      tokensRemaining: 29_850,
    })
  })
})
