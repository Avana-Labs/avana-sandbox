/**
 * Non-secret Ask AI policy shared by the Convex orchestration and UI.
 * Keep limits here so model, token, and request policy cannot drift between surfaces.
 */
export const ASK_AI_CONFIG = {
  agentName: "avana-ask-ai",
  defaultModel: "gpt-5.6-luna",
  maxInputCharacters: 2_000,
  maxOutputTokens: 900,
  maxToolSteps: 5,
  recentMessageLimit: 20,
  ragResultLimit: 6,
  streamThrottleMs: 250,
  limits: {
    messagesPerDay: 20,
    minimumMessageIntervalMs: 5_000,
    dailyTokenBudget: 30_000,
    globalMessagesPerDay: 20_000,
  },
  freshness: {
    tokenPriceStaleAfterMs: 20 * 60 * 1_000,
    poolMetricsStaleAfterMs: 30 * 60 * 1_000,
    aaveMarketStaleAfterMs: 20 * 60 * 1_000,
  },
} as const

export const ASK_AI_DOMAIN_REJECTION =
  "Ask AI is focused on Avana, LP collateral, DeFi lending, supported crypto markets, liquidity pools, and position risk. Ask me about your collateral, borrowing capacity, health factor, liquidation risk, Aave rates, or an Avana-supported market."

export const ASK_AI_WALLET_REQUIRED =
  "Connect your wallet to analyze your personal Avana positions. I can still answer general Avana and market questions without it."

export type AskAIDataStatus = "fresh" | "stale" | "unavailable"

export type AskAIDataFreshness = {
  source: string
  sourceUpdatedAt: number | null
  lastSuccessfulRefresh: number | null
  status: AskAIDataStatus
}
