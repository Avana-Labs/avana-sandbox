export type AskAIChatMessage = {
  role: "user" | "assistant"
  text: string
}

export type AskAIChatRequest = {
  threadId: string
  messages: AskAIChatMessage[]
  prompt: string
}

export type AskAIChatEvent =
  | {
      type: "meta"
      promptMessageId: string
      domain: { allowed: boolean; category: string; intent: string }
      tool: { name: string; query: string; request: string; result: string }
    }
  | {
      type: "retrieval"
      chunks: Array<{ id: string; source: string; locator: string; score: number; text: string }>
    }
  | { type: "sources"; sources: Array<{ domain: string; title: string; url?: string }> }
  | { type: "visual"; visual: { type: "chart"; label: string; value: string; points: number[]; delta?: string } }
  | { type: "text-delta"; delta: string }
  | { type: "done" }
  | { type: "error"; message: string }
