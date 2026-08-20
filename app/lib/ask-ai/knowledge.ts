export type AskAIKnowledgeChunk = {
  key: string
  title: string
  content: string
  tags: string[]
  sourceUrl?: string
}

const STOP_WORDS = new Set([
  "about",
  "does",
  "explain",
  "from",
  "have",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
])

export function rankAskAIKnowledge<T extends AskAIKnowledgeChunk>(rows: T[], query: string, limit = 4): T[] {
  const terms = [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 2 && !STOP_WORDS.has(term)),
    ),
  ]
  return rows
    .map((row) => {
      const title = row.title.toLowerCase()
      const tags = row.tags.join(" ").toLowerCase()
      const content = row.content.toLowerCase()
      const score = terms.reduce(
        (total, term) =>
          total + (title.includes(term) ? 4 : 0) + (tags.includes(term) ? 3 : 0) + (content.includes(term) ? 1 : 0),
        0,
      )
      return { row, score }
    })
    .filter(({ score }) => score >= 3)
    .sort((left, right) => right.score - left.score || left.row.key.localeCompare(right.row.key))
    .slice(0, Math.min(Math.max(limit, 1), 8))
    .map(({ row }) => row)
}

export function answerFromAskAIKnowledge(chunks: AskAIKnowledgeChunk[]): string | null {
  if (chunks.length === 0) return null
  const answer = chunks.map((chunk) => chunk.content).join("\n\n")
  const sources = chunks
    .map((chunk) =>
      chunk.sourceUrl ? `- [${chunk.title}](${chunk.sourceUrl})` : `- ${chunk.title} (Avana knowledge base)`,
    )
    .join("\n")
  return `${answer}\n\nSources:\n${sources}`
}
