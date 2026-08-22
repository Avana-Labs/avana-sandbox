import { Agent } from "@convex-dev/agent"
import { createOpenAI } from "@ai-sdk/openai"
import { stepCountIs } from "ai"
import { ConvexError, v } from "convex/values"
import { ASK_AI_CONFIG } from "../app/lib/ask-ai/config"
import { ASK_AI_AGENT_INSTRUCTIONS } from "../app/lib/ask-ai/agent-instructions"
import { routeAskAITurn, type AskAIModelTier } from "../app/lib/ask-ai/domain-gate"
import { components, internal } from "./_generated/api"
import { internalAction } from "./_generated/server"
import { searchAvanaKnowledgeTool } from "./askAIRag"
import {
  readBorrowCapacityTool,
  readPoolMetricsTool,
  readPortfolioTool,
  readPositionRiskTool,
  searchMarketsTool,
  simulateBorrowTool,
  stressPositionTool,
  createAskAITurnTools,
} from "./askAIAgentTools"

// Re-exported for existing importers (tests); the source of truth now lives in agent-instructions.ts.
export { ASK_AI_AGENT_INSTRUCTIONS }

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Model tiers. The fast tier serves greetings, prices, pools, and education;
// the reasoning tier is reserved for risk/borrow/stress analysis. FAST_MODEL
// falls back to the reasoning model until ASK_AI_FAST_MODEL is configured, so
// tiering ships safely — the per-turn tool gating and step limits already
// deliver most of the cost win regardless of which model runs.
const REASONING_MODEL = process.env.ASK_AI_MODEL?.trim() || ASK_AI_CONFIG.defaultModel
const FAST_MODEL = process.env.ASK_AI_FAST_MODEL?.trim() || REASONING_MODEL

const ASK_AI_TOOLS = {
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
} as const

function createAskAIAgent(model: string): Agent {
  return new Agent(components.agent, {
    name: ASK_AI_CONFIG.agentName,
    languageModel: openai(model),
    instructions: ASK_AI_AGENT_INSTRUCTIONS,
    // Per-turn `stopWhen` (see generateTurn) overrides this ceiling downward;
    // it stays here as the safety cap for any other caller.
    stopWhen: stepCountIs(ASK_AI_CONFIG.maxToolSteps),
    tools: ASK_AI_TOOLS,
  })
}

// Default export (reasoning tier) preserved for existing importers/tests.
export const askAIAgent: Agent = createAskAIAgent(REASONING_MODEL)
const askAIFastAgent: Agent = FAST_MODEL === REASONING_MODEL ? askAIAgent : createAskAIAgent(FAST_MODEL)

const ASK_AI_AGENTS: Record<AskAIModelTier, { agent: Agent; model: string }> = {
  reasoning: { agent: askAIAgent, model: REASONING_MODEL },
  fast: { agent: askAIFastAgent, model: FAST_MODEL },
}

type PreparedTurn = {
  turnId: import("./_generated/dataModel").Id<"askAITurns">
  threadId: string
  ownerSubject: string
  promptMessageId: string
  prompt: string
}

// Financial tool -> persisted richParts kind (docs/ask-ai-lane-contracts.md §1).
const FINANCIAL_TOOL_KINDS = {
  read_portfolio: "portfolio",
  read_borrow_capacity: "borrow_capacity",
  read_position_risk: "position_risk",
  simulate_borrow: "simulate_borrow",
  stress_position: "stress_position",
} as const

type FinancialToolName = keyof typeof FINANCIAL_TOOL_KINDS
type DataProvenance = "sandbox" | "connected_wallet" | "onchain"

// Matches the persisted `sources` validator in askAI.completeGeneratedTurn.
type AskAISource = {
  domain: string
  title: string
  locator: string
  url?: string
  kind?: string
  version?: string
}

const ASK_AI_ERROR_CODES = ["ASK_AI_GENERATION_FAILED", "ASK_AI_RATE_LIMITED", "ASK_AI_UNAVAILABLE"] as const
type AskAIErrorCode = (typeof ASK_AI_ERROR_CODES)[number]

// Only ConvexErrors carrying our { code, message } contract are user-safe to
// re-throw verbatim; everything else is classified and sanitized below so no
// function name, request id, or stack leaks to the client.
function isCodedAskAIError(error: unknown): error is ConvexError<{ code: AskAIErrorCode; message: string }> {
  return (
    error instanceof ConvexError &&
    typeof error.data === "object" &&
    error.data !== null &&
    "code" in error.data &&
    (ASK_AI_ERROR_CODES as readonly string[]).includes((error.data as { code: unknown }).code as string) &&
    "message" in error.data
  )
}

function toClientAskAIError(error: unknown): ConvexError<{ code: AskAIErrorCode; message: string }> {
  if (isCodedAskAIError(error)) return error
  const raw = (error instanceof Error ? error.message : String(error)).toLowerCase()
  if (/rate.?limit|too many|429|quota/.test(raw))
    return new ConvexError({
      code: "ASK_AI_RATE_LIMITED",
      message: "Ask AI is handling a lot of requests right now. Please wait a moment and try again.",
    })
  if (/unavailable|overloaded|timeout|timed out|network|econn|fetch failed|50[234]/.test(raw))
    return new ConvexError({
      code: "ASK_AI_UNAVAILABLE",
      message: "Ask AI is temporarily unavailable. Please try again shortly.",
    })
  return new ConvexError({
    code: "ASK_AI_GENERATION_FAILED",
    message: "Ask AI could not complete this response. Please try again.",
  })
}

type GeneratedTurn = {
  text: string
  promptMessageId: string
  assistantMessageId: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

export const generateTurn = internalAction({
  args: {
    turnId: v.id("askAITurns"),
  },
  handler: async (ctx, { turnId }): Promise<GeneratedTurn | null> => {
    const startedAt = Date.now()
    let turn: PreparedTurn
    try {
      const claimed = await ctx.runMutation(internal.askAI.claimQueuedTurn, { turnId })
      if (!claimed) return null
      turn = claimed as PreparedTurn
    } catch (error) {
      throw toClientAskAIError(error)
    }
    // Route the turn to the smallest capable tool subset + model tier + step
    // budget. Classified server-side from the prompt (never a client arg) so a
    // simple price question can't be coerced into loading every tool.
    const route = routeAskAITurn(turn.prompt)
    const { model: turnModel } = ASK_AI_AGENTS[route.modelTier]
    const turnTools = {
      web_search: ASK_AI_TOOLS.web_search,
      search_avana_knowledge: ASK_AI_TOOLS.search_avana_knowledge,
      ...createAskAITurnTools(turn.turnId),
    }
    const turnAgent = new Agent(components.agent, {
      name: ASK_AI_CONFIG.agentName,
      languageModel: openai(turnModel),
      instructions: ASK_AI_AGENT_INSTRUCTIONS,
      stopWhen: stepCountIs(ASK_AI_CONFIG.maxToolSteps),
      tools: turnTools,
    })
    try {
      const result = await turnAgent.streamText(
        ctx,
        { threadId: turn.threadId, userId: turn.ownerSubject },
        {
          promptMessageId: turn.promptMessageId,
          instructions: ASK_AI_AGENT_INSTRUCTIONS,
          maxOutputTokens: ASK_AI_CONFIG.maxOutputTokens,
          stopWhen: stepCountIs(route.maxSteps),
          activeTools: route.tools as unknown as (keyof typeof turnTools)[],
          toolChoice: route.toolChoice,
        },
        {
          contextOptions: {
            recentMessages: ASK_AI_CONFIG.recentMessageLimit,
            excludeToolMessages: true,
          },
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
            ? [toolResult.output as { sources?: unknown[]; entries?: unknown[] }]
            : [],
        ),
      )
      const sources = ragResults.flatMap((ragResult) => (ragResult.sources ?? []) as AskAISource[])
      // One entry per financial tool call the model actually made. `payload` is
      // the tool's structured result verbatim; `dataProvenance` is read
      // defensively because Lane D adds it to the tool output separately.
      const financialResults = steps.flatMap((step) =>
        step.toolResults.flatMap((toolResult) => {
          const kind = FINANCIAL_TOOL_KINDS[toolResult.toolName as FinancialToolName]
          if (!kind) return []
          const output = toolResult.output
          const provenance =
            output && typeof output === "object" && "dataProvenance" in output
              ? (output as { dataProvenance?: unknown }).dataProvenance
              : undefined
          const dataProvenance: DataProvenance | undefined =
            provenance === "sandbox" || provenance === "connected_wallet" || provenance === "onchain"
              ? provenance
              : undefined
          return [{ kind, ...(dataProvenance ? { dataProvenance } : {}), payload: output }]
        }),
      )
      // Retrieval passages for the RetrievalChunks card. The RAG tool output
      // exposes per-passage `sources` (title + locator); read `entries`/`text`/
      // `score` defensively so richer output populates them without inventing.
      const retrievalChunks = ragResults.flatMap((ragResult) => {
        const rows = Array.isArray(ragResult.entries)
          ? ragResult.entries
          : Array.isArray(ragResult.sources)
            ? ragResult.sources
            : []
        return rows.flatMap((row) => {
          if (!row || typeof row !== "object") return []
          const entry = row as { title?: unknown; locator?: unknown; text?: unknown; score?: unknown }
          const title = typeof entry.title === "string" && entry.title.length > 0 ? entry.title : "Avana documentation"
          const locator = typeof entry.locator === "string" ? entry.locator : ""
          const text = typeof entry.text === "string" && entry.text.length > 0 ? entry.text : locator
          if (!text) return []
          const score = typeof entry.score === "number" ? entry.score : undefined
          return [{ title, locator, text, ...(score !== undefined ? { score } : {}) }]
        })
      })
      await ctx.runMutation(internal.askAI.completeGeneratedTurn, {
        turnId: turn.turnId,
        assistantMessageId: assistantMessage._id,
        model: turnModel,
        usage,
        richParts: {
          sources,
          usage,
          ...(financialResults.length > 0 ? { financialResults } : {}),
          ...(retrievalChunks.length > 0 ? { retrievalChunks } : {}),
        },
      })
      await ctx.runMutation(internal.askAITelemetry.record, {
        ownerSubject: turn.ownerSubject,
        threadId: turn.threadId,
        promptMessageId: turn.promptMessageId,
        status: "complete",
        model: turnModel,
        provider: "openai",
        durationMs: Date.now() - startedAt,
        ...usage,
        tools,
      })
      return {
        text: await result.text,
        promptMessageId: turn.promptMessageId,
        assistantMessageId: assistantMessage._id,
        usage,
      }
    } catch (error) {
      await ctx.runMutation(internal.askAI.failTurn, {
        turnId: turn.turnId,
      })
      // Keep the raw error in telemetry (detailed text, never client-visible)...
      await ctx.runMutation(internal.askAITelemetry.record, {
        ownerSubject: turn.ownerSubject,
        threadId: turn.threadId,
        promptMessageId: turn.promptMessageId,
        status: "failed",
        model: turnModel,
        provider: "openai",
        durationMs: Date.now() - startedAt,
        tools: [],
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown Ask AI failure",
      })
      // ...but only surface a sanitized, typed ConvexError to the client.
      throw toClientAskAIError(error)
    }
  },
})
