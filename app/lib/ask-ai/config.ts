/**
 * Non-secret Ask AI policy shared by the Convex orchestration and UI.
 * Keep limits here so model, token, and request policy cannot drift between surfaces.
 */
export const ASK_AI_CONFIG = {
  agentName: "avana-ask-ai",
  defaultModel: "gpt-5.6-luna",
  fastModel: "gpt-5.6-luna",
  openAIServiceTier: "default",
  contextWindowTokens: 1_050_000,
  maxInputCharacters: 2_000,
  maxOutputTokens: 900,
  topP: 0.98,
  reasoningEffort: "medium",
  textVerbosity: "medium",
  maxToolSteps: 5,
  recentMessageLimit: 8,
  ragResultLimit: 6,
  streamThrottleMs: 250,
  limits: {
    messagesPerDay: 20,
    minimumMessageIntervalMs: 5_000,
    // Cost backstop, sized so `messagesPerDay` is the limit users actually hit: a RAG + tool turn
    // can spend several thousand tokens, so 20 msgs/day needs generous headroom (30k blocked
    // usage after ~3 questions and surfaced as a confusing "limit reached" error).
    dailyTokenBudget: 500_000,
    reservedTokensPerTurn: 25_000,
    globalReservedTokensPerDay: 100_000_000,
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

/**
 * Feature flag for the deterministic mode-run cards (Risk / Stress / Returns) rendered
 * inline in Ask AI. OFF by default: when the env var is unset the entire mode-run path
 * is inert (no run is triggered, persisted, or rendered) and the existing Ask AI chat
 * is unchanged. Set NEXT_PUBLIC_ASK_AI_MODE_RUNS=1 to enable. Read at runtime (not baked
 * into ASK_AI_CONFIG) so both the Convex server and the client see the same value.
 */
export function askAiModeRunsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ASK_AI_MODE_RUNS === "1"
}
