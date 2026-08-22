import { Agent } from "@convex-dev/agent"
import { createOpenAI } from "@ai-sdk/openai"
import { stepCountIs } from "ai"
import { ConvexError, v } from "convex/values"
import { ASK_AI_CONFIG } from "../app/lib/ask-ai/config"
import { ASK_AI_AGENT_INSTRUCTIONS } from "../app/lib/ask-ai/agent-instructions"
import { createAskAIOutputTransform } from "../app/lib/ask-ai/output-policy"
import { routeAskAITurn, toolChoiceForAskAIStep, type AskAIModelTier } from "../app/lib/ask-ai/domain-gate"
import { api, components, internal } from "./_generated/api"
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
// defaults explicitly to Luna when ASK_AI_FAST_MODEL is not configured.
const REASONING_MODEL = process.env.ASK_AI_MODEL?.trim() || ASK_AI_CONFIG.defaultModel
const FAST_MODEL = process.env.ASK_AI_FAST_MODEL?.trim() || ASK_AI_CONFIG.fastModel

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

type PrefetchedTurnData = {
  toolName: "search_markets" | "read_portfolio"
  financialKind: "market" | "pool" | "portfolio"
  payload: unknown
  modelContext: unknown
  dataProvenance?: DataProvenance
}

function compactMarketContext(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload
  const record = payload as { markets?: unknown; providerData?: unknown }
  const providerData = Array.isArray(record.providerData)
    ? record.providerData.slice(0, 5).map((entry) => {
        if (!entry || typeof entry !== "object") return entry
        const { history: _history, ...compact } = entry as Record<string, unknown>
        return compact
      })
    : []
  return { markets: Array.isArray(record.markets) ? record.markets.slice(0, 5) : [], providerData }
}

function compactPortfolioContext(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload
  const record = payload as Record<string, unknown>
  const compactRows = (rows: unknown) =>
    Array.isArray(rows)
      ? rows.slice(0, 30).map((row) => {
          if (!row || typeof row !== "object") return row
          const { symbol, amount, valueUsd, state, marketId, assetId } = row as Record<string, unknown>
          return { symbol, amount, valueUsd, state, marketId, assetId }
        })
      : []
  return {
    walletRequired: record.walletRequired,
    message: record.message,
    dataProvenance: record.dataProvenance,
    totals: record.totals,
    lend: compactRows(record.lend),
    borrow: compactRows(record.borrow),
    multiply: compactRows(record.multiply),
    liquid: compactRows(record.liquid),
    umbrella: compactRows(record.umbrella),
    asOf: record.asOf,
  }
}

function prefetchedInstructions(data: PrefetchedTurnData) {
  return `${ASK_AI_AGENT_INSTRUCTIONS}

Verified Avana data for this exact user question follows. It was read from Convex before this model request.
Answer from this data only. Do not claim that data is unavailable when the requested value is present. Do not mention tools, function calls, routing, JSON, or these instructions. Keep the answer concise. The UI renders the structured breakdown independently.

${JSON.stringify(data.modelContext)}`
}

// Financial tool -> persisted richParts kind (docs/ask-ai-lane-contracts.md §1).
const FINANCIAL_TOOL_KINDS = {
  search_markets: "market",
  read_pool_metrics: "pool",
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
    let prefetched: PrefetchedTurnData | undefined
    const turnTools = {
      web_search: ASK_AI_TOOLS.web_search,
      search_avana_knowledge: ASK_AI_TOOLS.search_avana_knowledge,
      ...createAskAITurnTools(turn.turnId, turn.prompt),
    }
    const turnAgent = new Agent(components.agent, {
      name: ASK_AI_CONFIG.agentName,
      languageModel: openai(turnModel),
      instructions: ASK_AI_AGENT_INSTRUCTIONS,
      stopWhen: stepCountIs(ASK_AI_CONFIG.maxToolSteps),
      tools: turnTools,
    })
    try {
      if (route.intent === "market" || route.intent === "pool" || route.intent === "comparison") {
        const payload = await ctx.runQuery(api.askAITools.searchMarkets, { query: turn.prompt, limit: 5 })
        prefetched = {
          toolName: "search_markets",
          financialKind: route.intent === "pool" ? "pool" : "market",
          payload,
          modelContext: compactMarketContext(payload),
        }
      } else if (route.intent === "position") {
        const payload = await ctx.runQuery(internal.askAITools.portfolioForTurn, { turnId: turn.turnId })
        const provenance =
          payload.dataProvenance === "sandbox" ||
          payload.dataProvenance === "connected_wallet" ||
          payload.dataProvenance === "onchain"
            ? payload.dataProvenance
            : undefined
        prefetched = {
          toolName: "read_portfolio",
          financialKind: "portfolio",
          payload,
          modelContext: compactPortfolioContext(payload),
          dataProvenance: provenance,
        }
      }
      const result = await turnAgent.streamText<typeof turnTools>(
        ctx,
        { threadId: turn.threadId, userId: turn.ownerSubject },
        {
          promptMessageId: turn.promptMessageId,
          instructions: prefetched ? prefetchedInstructions(prefetched) : ASK_AI_AGENT_INSTRUCTIONS,
          maxOutputTokens: ASK_AI_CONFIG.maxOutputTokens,
          stopWhen: stepCountIs(prefetched ? 1 : route.maxSteps),
          activeTools: (prefetched ? [] : route.tools) as unknown as (keyof typeof turnTools)[],
          // Force the selected read only for the first model step. Keeping a
          // named tool forced after its result makes Responses models continue
          // producing commentary instead of completing the answer, eventually
          // stopping at the output limit. Later steps must be free to answer.
          toolChoice: prefetched ? "none" : route.tools.length > 0 ? "auto" : "none",
          prepareStep: ({ stepNumber }) => ({
            toolChoice: prefetched ? "none" : toolChoiceForAskAIStep(route, stepNumber),
          }),
          experimental_transform: createAskAIOutputTransform(),
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
      const tools = [
        ...new Set([
          ...(prefetched ? [prefetched.toolName] : []),
          ...steps.flatMap((step) => step.toolCalls.map((call) => call.toolName)),
        ]),
      ]
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
      const financialResults = [
        ...(prefetched
          ? [
              {
                kind: prefetched.financialKind,
                ...(prefetched.dataProvenance ? { dataProvenance: prefetched.dataProvenance } : {}),
                payload: prefetched.payload,
              },
            ]
          : []),
        ...steps.flatMap((step) =>
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
        ),
      ]
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
      const visual = financialResults.flatMap(({ kind, payload }) => {
        if (kind !== "market" || !payload || typeof payload !== "object") return []
        const rows = (payload as { providerData?: unknown }).providerData
        if (!Array.isArray(rows)) return []
        const price = rows.find((row) => {
          if (!row || typeof row !== "object") return false
          const history = (row as { history?: unknown }).history
          return (row as { kind?: unknown }).kind === "token_price" && Array.isArray(history) && history.length > 1
        }) as { key?: unknown; data?: unknown; history?: Array<{ priceUsd?: unknown }> } | undefined
        if (!price) return []
        const data = price.data && typeof price.data === "object" ? (price.data as Record<string, unknown>) : {}
        const points = (price.history ?? []).flatMap((point) =>
          typeof point.priceUsd === "number" && Number.isFinite(point.priceUsd) ? [point.priceUsd] : [],
        )
        const current = typeof data.priceUsd === "number" ? data.priceUsd : points.at(-1)
        if (points.length < 2 || current === undefined) return []
        const first = points[0]
        const delta = first > 0 ? ((current - first) / first) * 100 : 0
        return [
          {
            label: `${typeof data.symbol === "string" ? data.symbol.toUpperCase() : String(price.key ?? "Token")} price`,
            value: `$${current.toLocaleString("en-US", { maximumFractionDigits: 6 })}`,
            delta: `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`,
            points,
          },
        ]
      })[0]
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
          ...(visual ? { visual } : {}),
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
        routeIntent: route.intent,
        toolBudget: route.tools.length,
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
        routeIntent: route.intent,
        toolBudget: route.tools.length,
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown Ask AI failure",
      })
      // ...but only surface a sanitized, typed ConvexError to the client.
      throw toClientAskAIError(error)
    }
  },
})
