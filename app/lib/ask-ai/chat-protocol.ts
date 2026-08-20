export type AskAIChatMessage = {
  role: "user" | "assistant"
  text: string
}

export type AskAIUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}
