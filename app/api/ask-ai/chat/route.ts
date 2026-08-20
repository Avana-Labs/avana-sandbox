import { createOpenAI } from "@ai-sdk/openai"
import { ConvexHttpClient } from "convex/browser"
import { generateText, Output, streamText, type ModelMessage } from "ai"
import { z } from "zod"
import { api } from "@/convex/_generated/api"
import { ASK_AI_CONFIG } from "@/app/lib/ask-ai/config"
import type { DomainResult } from "@/app/lib/ask-ai/domain-gate"
import { fallbackAskAIRoute } from "@/app/lib/ask-ai/semantic-routing"
import type { AskAIChatEvent, AskAIChatRequest } from "@/app/lib/ask-ai/chat-protocol"

export const runtime = "nodejs"
export const maxDuration = 30

const SYSTEM_PROMPT = `You are Avana Ask AI, a concise and conversational DeFi assistant.
Answer greetings naturally. Never answer a greeting with a data-availability warning.
Your scope is Avana, LP collateral, DeFi lending, supported crypto markets, DEX liquidity pools, and wallet position risk.
Use the supplied Avana context as the source of truth. Do not invent prices, balances, risk thresholds, yields, or protocol state.
Never claim to sign or submit a transaction. Do not mention internal corpora, retrieval, mocks, disabled ingestion, or implementation details unless the user explicitly asks about data availability.
If the user asks what to buy or sell, explain relevant risks and tradeoffs without making the decision for them.
If a request is unrelated to Avana or DeFi, redirect naturally in one short sentence.
If context is insufficient for a factual financial claim, say exactly which data is unavailable and offer a useful next question.`

const routingSchema = z.object({
  allowed: z.boolean(),
  category: z.enum([
    "avana",
    "lp_collateral",
    "defi_lending",
    "crypto_market",
    "dex_pool",
    "aave",
    "position_risk",
    "protocol_education",
    "unsupported",
  ]),
  intent: z.enum([
    "position",
    "market",
    "pool",
    "borrow_simulation",
    "stress_test",
    "comparison",
    "education",
    "risk",
    "unsupported",
  ]),
  confidence: z.number().min(0).max(1),
})

async function routeRequest(body: AskAIChatRequest, apiKey?: string): Promise<DomainResult> {
  const fallback = fallbackAskAIRoute(body.prompt, body.messages)
  if (!fallback.allowed || !apiKey || process.env.ASK_AI_USE_MOCKS === "true") return fallback

  try {
    const openai = createOpenAI({ apiKey })
    const result = await generateText({
      model: openai(process.env.ASK_AI_MODEL || ASK_AI_CONFIG.defaultModel),
      output: Output.object({ schema: routingSchema, name: "avana_request_route" }),
      system: `Route the latest user message for Avana Ask AI.
Use recent conversation to resolve short follow-ups such as "why?", "what about the other one?", or "go deeper".
Personal balances, wallet holdings, positions, borrowing capacity, health, liquidation, and stress scenarios use position-related intents.
Prices, rates, supported crypto assets, pools, LP collateral, Aave, and Avana education are in scope.
Investment recommendations remain in scope as education; route them to market or education and let the assistant explain risks without directing a trade.
Only use unsupported when the request is clearly unrelated to Avana, DeFi, crypto markets, or the active conversation.
Ambiguous requests should stay allowed with the best contextual intent.`,
      messages: modelMessages(body.messages, body.prompt),
      maxOutputTokens: 160,
    })
    return result.output
  } catch {
    return fallback
  }
}

function validRequest(value: unknown): value is AskAIChatRequest {
  if (!value || typeof value !== "object") return false
  const request = value as Partial<AskAIChatRequest>
  return (
    typeof request.threadId === "string" &&
    request.threadId.length > 0 &&
    typeof request.prompt === "string" &&
    request.prompt.trim().length > 0 &&
    request.prompt.length <= ASK_AI_CONFIG.maxInputCharacters &&
    (request.retryPromptMessageId === undefined || typeof request.retryPromptMessageId === "string") &&
    Array.isArray(request.messages) &&
    request.messages.length <= ASK_AI_CONFIG.recentMessageLimit
  )
}

function modelMessages(messages: AskAIChatRequest["messages"], prompt: string): ModelMessage[] {
  const history = messages
    .filter((message) => (message.role === "user" || message.role === "assistant") && message.text.trim())
    .map((message) => ({ role: message.role, content: message.text.slice(0, 20_000) }) as ModelMessage)
  if (history.at(-1)?.role !== "user" || history.at(-1)?.content !== prompt) {
    history.push({ role: "user", content: prompt })
  }
  return history
}

function fallbackChunks(text: string) {
  return text.split(/(\s+)/).filter(Boolean)
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Ask AI session required" }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  if (!validRequest(body)) return Response.json({ error: "Invalid Ask AI request" }, { status: 400 })

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) return Response.json({ error: "Ask AI persistence is unavailable" }, { status: 503 })
  const apiKey = process.env.OPENAI_API_KEY
  const useMocks = process.env.ASK_AI_USE_MOCKS === "true"
  if (!apiKey && !useMocks)
    return Response.json(
      { error: "Ask AI model is not configured. Add OPENAI_API_KEY to this runtime." },
      { status: 503 },
    )

  const convex = new ConvexHttpClient(convexUrl)
  convex.setAuth(authorization.slice("Bearer ".length))

  const encoder = new TextEncoder()
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AskAIChatEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      let promptMessageId: string | undefined
      try {
        const routing = await routeRequest(body, apiKey)
        const turn = await convex.mutation(api.askAI.beginTurn, {
          threadId: body.threadId,
          prompt: body.prompt,
          retryPromptMessageId: body.retryPromptMessageId,
          routing,
        })
        promptMessageId = turn.messageId
        send({ type: "meta", promptMessageId: turn.messageId, domain: turn.domain, tool: turn.tool })
        if (turn.retrievalChunks.length > 0) send({ type: "retrieval", chunks: turn.retrievalChunks })
        if (turn.sources.length > 0) send({ type: "sources", sources: turn.sources })
        if (turn.visual) send({ type: "visual", visual: turn.visual })
        if (turn.financialResult) send({ type: "financial-result", result: turn.financialResult })

        let fullText = ""
        let usage: { inputTokens: number; outputTokens: number; totalTokens: number } | undefined
        const useLiveModel = Boolean(apiKey) && !useMocks
        if (useLiveModel) {
          const openai = createOpenAI({ apiKey })
          const result = streamText({
            model: openai(process.env.ASK_AI_MODEL || ASK_AI_CONFIG.defaultModel),
            system: `${SYSTEM_PROMPT}\n\nAvana context for this turn:\n${turn.grounding}`,
            messages: modelMessages(body.messages, body.prompt),
            maxOutputTokens: ASK_AI_CONFIG.maxOutputTokens,
          })
          for await (const delta of result.textStream) {
            fullText += delta
            send({ type: "text-delta", delta })
          }
          const providerUsage = await result.usage
          usage = {
            inputTokens: providerUsage.inputTokens ?? 0,
            outputTokens: providerUsage.outputTokens ?? 0,
            totalTokens: providerUsage.totalTokens ?? 0,
          }
          send({ type: "usage", usage })
        } else {
          for (const delta of fallbackChunks(turn.fallbackResponse)) {
            fullText += delta
            send({ type: "text-delta", delta })
            await new Promise((resolve) => setTimeout(resolve, 18))
          }
        }

        await convex.mutation(api.askAI.completeTurn, {
          threadId: body.threadId,
          promptMessageId: turn.messageId,
          message: fullText,
          richParts: {
            tool: turn.tool,
            retrievalChunks: turn.retrievalChunks,
            sources: turn.sources,
            visual: turn.visual,
            financialResult: turn.financialResult,
            usage,
          },
        })
        send({ type: "done" })
      } catch (error) {
        if (promptMessageId)
          await convex.mutation(api.askAI.failTurn, { threadId: body.threadId, promptMessageId }).catch(() => undefined)
        send({ type: "error", message: error instanceof Error ? error.message : "Ask AI failed" })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(responseStream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
