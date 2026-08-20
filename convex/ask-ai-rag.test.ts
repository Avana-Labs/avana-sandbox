import { describe, expect, test } from "vitest"
import { runAvanaKnowledgeSearch } from "./askAIRag"

describe("Ask AI RAG availability", () => {
  test("fails closed when retrieval returns no Avana sources", async () => {
    await expect(
      runAvanaKnowledgeSearch(async () => ({ text: "", entries: [], usage: { tokens: 0 } })),
    ).resolves.toEqual({
      status: "unavailable",
      message: "Avana's protocol knowledge is temporarily unavailable. Please try again shortly.",
      sources: [],
      retrievalTokens: 0,
    })
  })

  test("fails closed when embedding or search throws", async () => {
    await expect(
      runAvanaKnowledgeSearch(async () => {
        throw new Error("embedding unavailable")
      }),
    ).resolves.toMatchObject({ status: "unavailable", sources: [] })
  })

  test("returns title, locator, version, and URL for protocol citations", async () => {
    await expect(
      runAvanaKnowledgeSearch(async () => ({
        text: "Grounded answer context",
        entries: [
          {
            text: "Risk Management > Oracle Layer\n\nDual-oracle verification...",
            metadata: {
              sourceTitle: "Avana Whitepaper",
              sourceUrl: "https://avana.finance/whitepaper",
              sourceKind: "whitepaper",
              version: "v1",
            },
          },
        ],
        usage: { tokens: 12 },
      })),
    ).resolves.toMatchObject({
      status: "available",
      sources: [
        {
          title: "Avana Whitepaper",
          locator: "Risk Management > Oracle Layer",
          version: "v1",
          url: "https://avana.finance/whitepaper",
        },
      ],
    })
  })
})
