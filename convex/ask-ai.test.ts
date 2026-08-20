// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { register as registerAgent } from "@convex-dev/agent/test"
import { describe, expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")

function askAITest() {
  const t = convexTest(schema, modules)
  registerAgent(t)
  return t
}

describe("Ask AI thread ownership", () => {
  test("renames an owned thread and rejects invalid titles", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:owner" })
    const thread = await owner.mutation(api.askAI.create, {})

    await expect(owner.mutation(api.askAI.rename, { threadId: thread.threadId, title: "  ETH   risk\nreview  " })).resolves.toEqual({
      threadId: thread.threadId,
      title: "ETH risk review",
    })
    await expect(owner.mutation(api.askAI.rename, { threadId: thread.threadId, title: "   " })).rejects.toThrow(
      "Thread title must contain 1 to 80 characters",
    )
  })

  test("does not allow another subject to rename a thread", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:owner" })
    const other = t.withIdentity({ subject: "ask-guest:other" })
    const thread = await owner.mutation(api.askAI.create, {})

    await expect(other.mutation(api.askAI.rename, { threadId: thread.threadId, title: "Stolen" })).rejects.toThrow(
      "Thread not found",
    )
  })

  test("archives and restores only owned threads", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:owner" })
    const other = t.withIdentity({ subject: "ask-guest:other" })
    const thread = await owner.mutation(api.askAI.create, {})

    await expect(other.mutation(api.askAI.archive, { threadId: thread.threadId })).rejects.toThrow("Thread not found")
    await owner.mutation(api.askAI.archive, { threadId: thread.threadId })
    await expect(owner.query(api.askAI.list, {})).resolves.toEqual([])
    await expect(owner.query(api.askAI.list, { includeArchived: true })).resolves.toEqual([
      expect.objectContaining({ threadId: thread.threadId, status: "archived" }),
    ])
    await expect(other.mutation(api.askAI.unarchive, { threadId: thread.threadId })).rejects.toThrow("Thread not found")
    await owner.mutation(api.askAI.unarchive, { threadId: thread.threadId })
    await expect(owner.query(api.askAI.list, {})).resolves.toEqual([
      expect.objectContaining({ threadId: thread.threadId, status: "active" }),
    ])
  })
})
