import { RAG } from "@convex-dev/rag"
import { createOpenAI } from "@ai-sdk/openai"
import { v } from "convex/values"
import { AVANA_KNOWLEDGE_CHUNKS, AVANA_KNOWLEDGE_VERSION } from "./askAICorpus.generated"
import { components } from "./_generated/api"
import { internalAction } from "./_generated/server"

export const AVANA_RAG_NAMESPACE = "avana-knowledge"

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const avanaRag = new RAG<
  Record<string, never>,
  { sourceId: string; sourceTitle: string; sourceKind: string; sourceUrl: string; version: string }
>(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1_536,
})

export const ingestCorpus = internalAction({
  args: { sourceId: v.optional(v.string()) },
  handler: async (ctx, { sourceId }) => {
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
