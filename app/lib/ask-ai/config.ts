/**
 * Non-secret Ask AI policy shared by the Convex orchestration and UI.
 * Keep limits here so model, token, and request policy cannot drift between surfaces.
 */
export const ASK_AI_CONFIG = {
  agentName: "avana-ask-ai",
  defaultModel: "gpt-5.6-luna",
  fastModel: "gpt-5.6-luna",
  contextWindowTokens: 1_050_000,
  maxInputCharacters: 2_000,
  maxOutputTokens: 900,
  maxToolSteps: 5,
  recentMessageLimit: 20,
  ragResultLimit: 6,
  streamThrottleMs: 250,
  limits: {
    messagesPerDay: 20,
    minimumMessageIntervalMs: 5_000,
    // Cost backstop, sized so `messagesPerDay` is the limit users actually hit: a RAG + tool turn
    // can spend several thousand tokens, so 20 msgs/day needs generous headroom (30k blocked
    // usage after ~3 questions and surfaced as a confusing "limit reached" error).
    dailyTokenBudget: 500_000,
    globalMessagesPerDay: 20_000,
  },
  freshness: {
    tokenPriceStaleAfterMs: 20 * 60 * 1_000,
    poolMetricsStaleAfterMs: 30 * 60 * 1_000,
    aaveMarketStaleAfterMs: 20 * 60 * 1_000,
  },
} as const

export const ASK_AI_WALLET_REQUIRED =
  "Connect your wallet to analyze your personal Avana positions. I can still answer general Avana and market questions without it."
