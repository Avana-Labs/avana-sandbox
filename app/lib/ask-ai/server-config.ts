import "server-only"

import { ASK_AI_CONFIG } from "./config"

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value == null || value.trim() === "") return fallback
  if (value === "true") return true
  if (value === "false") return false
  throw new Error(`Expected true or false, received ${value}`)
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  if (value == null || value.trim() === "") return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`Expected a positive integer, received ${value}`)
  return parsed
}

export function getAskAIServerConfig() {
  return {
    model: process.env.ASK_AI_MODEL?.trim() || ASK_AI_CONFIG.defaultModel,
    useMocks: readBoolean(process.env.ASK_AI_USE_MOCKS, false),
    maxOutputTokens: readPositiveInteger(process.env.ASK_AI_MAX_OUTPUT_TOKENS, ASK_AI_CONFIG.maxOutputTokens),
    providers: {
      openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
      coinGeckoConfigured: Boolean(process.env.COINGECKO_API_KEY),
      uniswapGraphConfigured: Boolean(process.env.UNISWAP_GRAPH_API_KEY),
    },
  }
}
