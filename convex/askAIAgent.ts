import { Agent } from "@convex-dev/agent"
import { createOpenAI } from "@ai-sdk/openai"
import { stepCountIs } from "ai"
import { v } from "convex/values"
import { ASK_AI_CONFIG } from "../app/lib/ask-ai/config"
import { ASK_AI_AGENT_INSTRUCTIONS } from "../app/lib/ask-ai/agent-instructions"
import { api, components, internal } from "./_generated/api"
import { action } from "./_generated/server"
import { searchAvanaKnowledgeTool } from "./askAIRag"
import {
  readBorrowCapacityTool,
  readPoolMetricsTool,
  readPortfolioTool,
  readPositionRiskTool,
  searchMarketsTool,
  simulateBorrowTool,
  stressPositionTool,
} from "./askAIAgentTools"

// Re-exported for existing importers (tests); the source of truth now lives in agent-instructions.ts.
export { ASK_AI_AGENT_INSTRUCTIONS }

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const askAIAgent: Agent = new Agent(components.agent, {
  name: ASK_AI_CONFIG.agentName,
  languageModel: openai(process.env.ASK_AI_MODEL?.trim() || ASK_AI_CONFIG.defaultModel),
  instructions: ASK_AI_AGENT_INSTRUCTIONS,
  stopWhen: stepCountIs(ASK_AI_CONFIG.maxToolSteps),
  tools: {
    // Provider-executed tools do not have a local execute handler; the Agent's
    // ToolSet constraint currently assumes one even though the Responses model
    // accepts this tool directly.
    web_search: openai.tools.webSearch({ searchContextSize: "low" }) as never,
    search_avana_knowledge: searchAvanaKnowledgeTool,
    read_portfolio: readPortfolioTool,
    read_borrow_capacity: readBorrowCapacityTool,
    read_position_risk: readPositionRiskTool,
    simulate_borrow: simulateBorrowTool,
    stress_position: stressPositionTool,
    search_markets: searchMarketsTool,
    read_pool_metrics: readPoolMetricsTool,
  },
})

type PreparedTurn = {
  ownerSubject: string
  messageId: string
}

type GeneratedTurn = {
  text: string
  promptMessageId: string
  assistantMessageId: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

export const generateTurn = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    retryPromptMessageId: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("askAIAttachments"))),
  },
  handler: async (ctx, args): Promise<GeneratedTurn> => {
    const startedAt = Date.now()
    const turn = (await ctx.runMutation(api.askAI.beginTurn, args)) as PreparedTurn
    try {
      const result = await askAIAgent.streamText(
        ctx,
        { threadId: args.threadId, userId: turn.ownerSubject },
        {
          promptMessageId: turn.messageId,
          instructions: ASK_AI_AGENT_INSTRUCTIONS,
          maxOutputTokens: ASK_AI_CONFIG.maxOutputTokens,
        },
        {
          saveStreamDeltas: {
            chunking: "word",
            throttleMs: ASK_AI_CONFIG.streamThrottleMs,
          },
        },
      )
      await result.consumeStream()
      const assistantMessage = result.savedMessages?.findLast((message) => message.message?.role === "assistant")
      if (!assistantMessage) throw new Error("Ask AI did not persist an assistant response")
      const providerUsage = await result.usage
      const usage = {
        inputTokens: providerUsage.inputTokens ?? 0,
        outputTokens: providerUsage.outputTokens ?? 0,
        totalTokens: providerUsage.totalTokens ?? 0,
      }
      const steps = await result.steps
      const tools = [...new Set(steps.flatMap((step) => step.toolCalls.map((call) => call.toolName)))]
      const ragResults = steps.flatMap((step) =>
        step.toolResults.flatMap((toolResult) =>
          toolResult.toolName === "search_avana_knowledge" &&
          typeof toolResult.output === "object" &&
          toolResult.output !== null
            ? [toolResult.output as { sources?: unknown[] }]
            : [],
        ),
      )
      const sources = ragResults.flatMap((ragResult) => ragResult.sources ?? [])
      await ctx.runMutation(api.askAI.completeGeneratedTurn, {
        threadId: args.threadId,
        promptMessageId: turn.messageId,
        assistantMessageId: assistantMessage._id,
        usage,
        richParts: {
          sources,
          usage,
        },
      })
      await ctx.runMutation(internal.askAITelemetry.record, {
        ownerSubject: turn.ownerSubject,
        threadId: args.threadId,
        promptMessageId: turn.messageId,
        status: "complete",
        model: process.env.ASK_AI_MODEL?.trim() || ASK_AI_CONFIG.defaultModel,
        provider: "openai",
        durationMs: Date.now() - startedAt,
        ...usage,
        tools,
      })
      return {
        text: await result.text,
        promptMessageId: turn.messageId,
        assistantMessageId: assistantMessage._id,
        usage,
      }
    } catch (error) {
      await ctx.runMutation(api.askAI.failTurn, {
        threadId: args.threadId,
        promptMessageId: turn.messageId,
      })
      await ctx.runMutation(internal.askAITelemetry.record, {
        ownerSubject: turn.ownerSubject,
        threadId: args.threadId,
        promptMessageId: turn.messageId,
        status: "failed",
        model: process.env.ASK_AI_MODEL?.trim() || ASK_AI_CONFIG.defaultModel,
        provider: "openai",
        durationMs: Date.now() - startedAt,
        tools: [],
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown Ask AI failure",
      })
      throw error
    }
  },
})
