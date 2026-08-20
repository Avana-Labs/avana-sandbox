import { RAG } from "@convex-dev/rag"
import { createTool } from "@convex-dev/agent"
import { createOpenAI } from "@ai-sdk/openai"
import { v } from "convex/values"
import { z } from "zod"
import { ASK_AI_CONFIG } from "../app/lib/ask-ai/config"
import { AVANA_KNOWLEDGE_CHUNKS, AVANA_KNOWLEDGE_VERSION } from "./askAICorpus.generated"
import { components } from "./_generated/api"
import { internalAction } from "./_generated/server"

export const AVANA_RAG_NAMESPACE = "avana-knowledge"

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
const RAG_UNAVAILABLE_MESSAGE = "Avana's protocol knowledge is temporarily unavailable. Please try again shortly."

type AvanaSearchResult = {
  text: string
  entries: Array<{
    text: string
    title?: string
    metadata?: {
      sourceTitle?: string
      sourceUrl?: string
      sourceKind?: string
      version?: string
    }
  }>
  usage: { tokens: number }
}

export async function runAvanaKnowledgeSearch(search: () => Promise<AvanaSearchResult>) {
  try {
    const result = await search()
    if (result.entries.length === 0)
      return {
        status: "unavailable" as const,
        message: RAG_UNAVAILABLE_MESSAGE,
        sources: [],
        retrievalTokens: result.usage.tokens,
      }
    return {
      status: "available" as const,
      text: result.text,
      sources: result.entries.map((entry) => ({
        domain: "avana",
        title: entry.metadata?.sourceTitle ?? entry.title ?? "Avana documentation",
        locator: entry.text.split("\n", 1)[0],
        url: entry.metadata?.sourceUrl,
        kind: entry.metadata?.sourceKind,
        version: entry.metadata?.version,
      })),
      retrievalTokens: result.usage.tokens,
    }
  } catch {
    return {
      status: "unavailable" as const,
      message: RAG_UNAVAILABLE_MESSAGE,
      sources: [],
      retrievalTokens: 0,
    }
  }
}

export const avanaRag = new RAG<
  Record<string, never>,
  { sourceId: string; sourceTitle: string; sourceKind: string; sourceUrl: string; version: string }
>(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1_536,
})

export const ingestCorpusIfVersionChanged = internalAction({
  args: { corpusVersion: v.string(), sourceId: v.optional(v.string()) },
  handler: async (ctx, { corpusVersion, sourceId }) => {
    if (corpusVersion !== AVANA_KNOWLEDGE_VERSION)
      throw new Error(`Corpus version mismatch: expected ${AVANA_KNOWLEDGE_VERSION}`)
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required to embed the Avana corpus")
    const sourceIds = [...new Set(AVANA_KNOWLEDGE_CHUNKS.map((chunk) => chunk.sourceId))].filter(
      (id) => !sourceId || id === sourceId,
    )
    if (sourceId && sourceIds.length === 0) throw new Error(`Unknown Avana knowledge source: ${sourceId}`)

    const results = []
    for (const id of sourceIds) {
      const chunks = AVANA_KNOWLEDGE_CHUNKS.filter((chunk) => chunk.sourceId === id)
      const first = chunks[0]
      if (!first) continue
      const result = await avanaRag.add(ctx, {
        namespace: AVANA_RAG_NAMESPACE,
        key: id,
        title: first.sourceTitle,
        contentHash: `${AVANA_KNOWLEDGE_VERSION}:${id}`,
        metadata: {
          sourceId: id,
          sourceTitle: first.sourceTitle,
          sourceKind: first.sourceKind,
          sourceUrl: first.sourceUrl,
          version: AVANA_KNOWLEDGE_VERSION,
        },
        chunks: chunks.map((chunk) => ({
          text: `${chunk.locator}\n\n${chunk.text}`,
          keywords: `${chunk.sourceTitle} ${chunk.locator} ${chunk.text}`,
        })),
      })
      results.push({ sourceId: id, status: result.status, created: result.created, tokens: result.usage.tokens })
    }
    return { version: AVANA_KNOWLEDGE_VERSION, sources: results }
  },
})

export const searchAvanaKnowledgeTool = createTool({
  description:
    "Search the authoritative Avana whitepaper, developer documentation, and FAQ. Use before answering how Avana works, protocol architecture, LP collateral, valuation, borrowing, liquidation, governance, safety, or legal questions.",
  inputSchema: z.object({ query: z.string().min(2).max(500) }),
  execute: (ctx, { query }) =>
    runAvanaKnowledgeSearch(() =>
      avanaRag.search(ctx, {
        namespace: AVANA_RAG_NAMESPACE,
        query,
        limit: ASK_AI_CONFIG.ragResultLimit,
        searchType: "hybrid",
        vectorWeight: 0.7,
        textWeight: 0.3,
        vectorScoreThreshold: 0.35,
      }),
    ),
})
