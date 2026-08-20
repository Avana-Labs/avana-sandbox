// @vitest-environment edge-runtime
import { register as registerAgent } from "@convex-dev/agent/test"
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")

describe("Ask AI attachment storage", () => {
  test("requires a session before issuing an upload URL", async () => {
    const t = convexTest(schema, modules)
    await expect(t.mutation(api.askAIAttachments.generateUploadUrl, {})).rejects.toThrow("Ask AI session required")
  })

  test("does not expose another subject's attachment list", async () => {
    const t = convexTest(schema, modules)
    registerAgent(t)
    const owner = t.withIdentity({ subject: "ask-guest:attachment-owner" })
    const other = t.withIdentity({ subject: "ask-guest:attachment-other" })
    const thread = await owner.mutation(api.askAI.create, {})
    await expect(other.query(api.askAIAttachments.list, { threadId: thread.threadId })).rejects.toThrow("Thread not found")
  })
})
