import { describe, expect, it } from "vitest"
import { answerFromAskAIKnowledge, rankAskAIKnowledge, type AskAIKnowledgeChunk } from "../knowledge"

const chunks: AskAIKnowledgeChunk[] = [
  {
    key: "lend",
    title: "Avana Lend",
    content: "Lend supplies assets to Avana lending markets.",
    tags: ["lend", "supply", "apy"],
    sourceUrl: "https://avana.finance/lend",
  },
  {
    key: "multiply",
    title: "Avana Multiply",
    content: "Multiply models leveraged collateral and debt.",
    tags: ["multiply", "leverage", "health factor"],
  },
]

describe("Ask AI knowledge retrieval", () => {
  it("ranks title and tag matches ahead of incidental content matches", () => {
    expect(rankAskAIKnowledge(chunks, "Explain Multiply health factor").map((chunk) => chunk.key)).toEqual(["multiply"])
  })

  it("returns no unsupported knowledge when there is no lexical match", () => {
    expect(rankAskAIKnowledge(chunks, "weather in Paris")).toEqual([])
  })

  it("adds linked and first-party citations to the grounded answer", () => {
    expect(answerFromAskAIKnowledge(chunks)).toContain("[Avana Lend](https://avana.finance/lend)")
    expect(answerFromAskAIKnowledge(chunks)).toContain("Avana Multiply (Avana knowledge base)")
  })
})
