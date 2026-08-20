// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")

describe("Ask AI operational telemetry", () => {
  test("reports latency, failures, tokens, and tool selection", async () => {
    const t = convexTest(schema, modules)
    const common = {
      ownerSubject: "ask-guest:telemetry",
      threadId: "thread-telemetry",
      model: "gpt-5.6-luna",
      provider: "openai",
    }
    await t.mutation(internal.askAITelemetry.record, {
      ...common,
      promptMessageId: "prompt-1",
      status: "complete",
      durationMs: 400,
      inputTokens: 100,
      outputTokens: 40,
      totalTokens: 140,
      tools: ["search_avana_knowledge"],
    })
    await t.mutation(internal.askAITelemetry.record, {
      ...common,
      promptMessageId: "prompt-2",
      status: "failed",
      durationMs: 100,
      tools: [],
      error: "Provider unavailable",
    })

    await expect(t.query(internal.askAITelemetry.report, {})).resolves.toMatchObject({
      total: 2,
      failures: 1,
      failureRate: 0.5,
      averageDurationMs: 400,
      totalTokens: 140,
    })
  })
})
