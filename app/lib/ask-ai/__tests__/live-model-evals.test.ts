import { createOpenAI } from "@ai-sdk/openai"
import { generateText, stepCountIs, tool } from "ai"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { ASK_AI_AGENT_INSTRUCTIONS } from "@/convex/askAIAgent"
import { ASK_AI_CONFIG } from "../config"

const enabled = process.env.RUN_ASK_AI_LIVE_EVALS === "1" && Boolean(process.env.OPENAI_API_KEY)
const live = enabled ? describe : describe.skip
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

const fixtures = [
  { prompt: "sup", expectedTool: null, required: /(?:hey|hi|help|what)/i },
  { prompt: "what's in my wallet balance?", expectedTool: "read_portfolio", required: /\$19,720/ },
  {
    prompt: "will I get liquidated if ETH falls 20%?",
    expectedTool: "stress_position",
    required: /(?:health|liquidat|risk)/i,
  },
  {
    prompt: "Explain Avana LP collateral valuation",
    expectedTool: "search_avana_knowledge",
    required: /(?:recover|liquid|collateral|nav)/i,
  },
  {
    prompt: "President Trump and the SEC are making a crypto announcement. What could it do to markets?",
    expectedTool: "web_search",
    required: /(?:scenario|uncertain|could|risk|market)/i,
  },
] as const

live("Ask AI live Luna evaluations", () => {
  it.each(fixtures)(
    "answers $prompt with the expected grounded behavior",
    async ({ prompt, expectedTool, required }) => {
      const calls: string[] = []
      const result = await generateText({
        model: openai(process.env.ASK_AI_MODEL?.trim() || ASK_AI_CONFIG.defaultModel),
        system: ASK_AI_AGENT_INSTRUCTIONS,
        prompt,
        stopWhen: stepCountIs(4),
        tools: {
          read_portfolio: tool({
            description: "Read authoritative wallet balances",
            inputSchema: z.object({}),
            execute: async () => {
              calls.push("read_portfolio")
              return { totals: { umbrellaUsd: 19_720, liquidUsd: 69_670 }, asOf: Date.now() }
            },
          }),
          stress_position: tool({
            description: "Run authoritative position stress",
            inputSchema: z.object({}),
            execute: async () => {
              calls.push("stress_position")
              return { projectedHealthFactor: 1.18, shock: { ETH: -0.2 }, asOf: Date.now() }
            },
          }),
          search_avana_knowledge: tool({
            description: "Search authoritative Avana documentation",
            inputSchema: z.object({ query: z.string() }),
            execute: async () => {
              calls.push("search_avana_knowledge")
              return {
                text: "Avana values LP collateral by recoverable unwind value and liquidity-aware risk controls.",
              }
            },
          }),
          web_search: tool({
            description: "Search current public information",
            inputSchema: z.object({ query: z.string() }),
            execute: async () => {
              calls.push("web_search")
              return { results: [{ title: "Current crypto policy announcement", date: "2026-08-20" }] }
            },
          }),
        },
      })

      if (expectedTool) expect(calls).toContain(expectedTool)
      else expect(calls).toHaveLength(0)
      expect(result.text).toMatch(required)
      expect(result.text).not.toMatch(/domain[_ ]guard|unsupported category|system prompt/i)
    },
    90_000,
  )
})
