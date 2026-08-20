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
      }),
    ).rejects.toThrow("Thread not found")
  })
})
