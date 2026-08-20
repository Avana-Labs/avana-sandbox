export type AskAIChatMessage = {
  role: "user" | "assistant"
  text: string
}

export type AskAIChatRequest = {
  threadId: string
  messages: AskAIChatMessage[]
  prompt: string
  retryPromptMessageId?: string
}

export type AskAIUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type AskAIFinancialResult = import("@/app/ask/components/ask-ai-financial-result-card").AskAIFinancialResult

export type AskAIChatEvent =
  | {
      type: "meta"
      promptMessageId: string
      domain: { allowed: boolean; category: string; intent: string }
      tool: { name: string; query: string; request: string; result: string } | null
    }
  | {
      type: "retrieval"
      chunks: Array<{ id: string; source: string; locator: string; score: number; text: string }>
    }
  | { type: "sources"; sources: Array<{ domain: string; title: string; url?: string }> }
  | { type: "visual"; visual: { type: "chart"; label: string; value: string; points: number[]; delta?: string } }
  | { type: "financial-result"; result: AskAIFinancialResult }
  | { type: "text-delta"; delta: string }
  | { type: "usage"; usage: AskAIUsage }
  | { type: "done" }
  | { type: "error"; message: string }
