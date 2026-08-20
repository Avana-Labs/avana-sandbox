import { createOpenAI } from "@ai-sdk/openai"
import { ConvexHttpClient } from "convex/browser"
import { streamText, type ModelMessage } from "ai"
import { api } from "@/convex/_generated/api"
import { ASK_AI_CONFIG } from "@/app/lib/ask-ai/config"
import type { AskAIChatEvent, AskAIChatRequest } from "@/app/lib/ask-ai/chat-protocol"

export const runtime = "nodejs"
export const maxDuration = 30

const SYSTEM_PROMPT = `You are Avana Ask AI, a concise and conversational DeFi assistant.
Answer greetings naturally. Never answer a greeting with a data-availability warning.
Your scope is Avana, LP collateral, DeFi lending, supported crypto markets, DEX liquidity pools, and wallet position risk.
Use the supplied Avana context as the source of truth. Do not invent prices, balances, risk thresholds, yields, or protocol state.
Never claim to sign or submit a transaction. Do not mention internal corpora, retrieval, mocks, disabled ingestion, or implementation details unless the user explicitly asks about data availability.
If context is insufficient for a factual financial claim, say exactly which data is unavailable and offer a useful next question.`

function validRequest(value: unknown): value is AskAIChatRequest {
  if (!value || typeof value !== "object") return false
  const request = value as Partial<AskAIChatRequest>
  return (
    typeof request.threadId === "string" &&
    request.threadId.length > 0 &&
    typeof request.prompt === "string" &&
    request.prompt.trim().length > 0 &&
    request.prompt.length <= ASK_AI_CONFIG.maxInputCharacters &&
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

  const convex = new ConvexHttpClient(convexUrl)
  convex.setAuth(authorization.slice("Bearer ".length))

  const encoder = new TextEncoder()
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AskAIChatEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      try {
        const turn = await convex.mutation(api.askAI.beginTurn, { threadId: body.threadId, prompt: body.prompt })
        send({ type: "meta", promptMessageId: turn.messageId, domain: turn.domain, tool: turn.tool })
        if (turn.retrievalChunks.length > 0) send({ type: "retrieval", chunks: turn.retrievalChunks })
        if (turn.sources.length > 0) send({ type: "sources", sources: turn.sources })
        if (turn.visual) send({ type: "visual", visual: turn.visual })

        let fullText = ""
        const apiKey = process.env.OPENAI_API_KEY
        const useLiveModel = Boolean(apiKey) && process.env.ASK_AI_USE_MOCKS !== "true" && turn.domain.allowed
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
            domain: turn.domain,
            tool: turn.tool,
            retrievalChunks: turn.retrievalChunks,
            sources: turn.sources,
            visual: turn.visual,
          },
        })
        send({ type: "done" })
      } catch (error) {
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
