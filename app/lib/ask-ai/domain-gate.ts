export const ASK_AI_DOMAIN_CATEGORIES = [
  "avana",
  "lp_collateral",
  "defi_lending",
  "crypto_market",
  "dex_pool",
  "aave",
  "position_risk",
  "protocol_education",
  "unsupported",
] as const

export const ASK_AI_INTENTS = [
  "position",
  "market",
  "pool",
  "borrow_simulation",
  "stress_test",
  "comparison",
  "education",
  "risk",
  "unsupported",
] as const

export type AskAIDomainCategory = (typeof ASK_AI_DOMAIN_CATEGORIES)[number]
export type AskAIIntent = (typeof ASK_AI_INTENTS)[number]

export type DomainResult = {
  allowed: boolean
  category: AskAIDomainCategory
  intent: AskAIIntent
  confidence: number
}

const POSITION_PATTERNS = [
  /\b(my|our)\b.{0,25}\b(position|positions|wallet|balances?|holdings?|funds|assets?|collateral|debt|borrow|health factor|ltv|liquidat)/i,
  /\bwhat(?:'s| is) in (?:my|our) wallet\b/i,
  /\b(show|analy[sz]e|compare)\b.{0,20}\b(my|our)\b/i,
  /\bhow much can i borrow\b/i,
  /\b(can i borrow|borrow another|borrow more|borrowing capacity|close am i to liquidation)\b/i,
]

const RISK_PATTERNS = [
  /\b(?:will|would|could|can|am|are)\s+(?:i|we)\s+(?:get\s+)?liquidat(?:ed|ion)?\b/i,
  /\b(?:my|our)\s+(?:liquidation|health factor|risk|ltv|buffer)\b/i,
  /\b(?:liquidation|health factor)\s+(?:risk|status|chance|probability)\b/i,
]

const STRESS_PATTERNS = [/\bwhat (?:happens|if)\b/i, /\b(stress|shock|drops?|falls?|depeg|price change)\b/i]

const POOL_PATTERNS = [
  /\b(pool|liquidity|volume|fee tier|tick|in range|out of range|weighting|weights|lp yields?)\b/i,
  /\b(uniswap|curve|balancer|aerodrome|sushiswap|pancakeswap)\b/i,
]

const MARKET_PATTERNS = [
  /\b(eth|ethereum|weth|usdc|usdt|dai|wbtc|bitcoin|gho|aave|token|asset)\b/i,
  /\b(price|worth|trading at|borrow rate|apr|apy|utilization|market)\b/i,
]

const EDUCATION_PATTERNS = [
  /\b(explain|what is|what does|how does|why does|methodology|work)\b/i,
  /\b(avana|lp collateral|health factor|ltv|liquidation threshold|oracle|aave hub)\b/i,
]

const GREETING_PATTERN =
  /^(?:(?:good\s+)?(?:morning|afternoon|evening)|(?:hi|hello|hey|yo|sup)(?:\s+there)?|what(?:'s| is)\s+up)[!.?\s]*$/i

export function isAskAIClarificationPrompt(message: string) {
  return /^(?:\?|huh\??|what\??|why\??|how so\??)$/i.test(message.trim())
}

export function isAskAIGreeting(message: string) {
  return GREETING_PATTERN.test(message.trim())
}

function matchesAny(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message))
}

/**
 * Advisory local semantic routing. Conversation scope is decided by Luna with
 * history; deterministic validation here is limited to empty/oversized input.
 */
export function classifyAskAIDomain(message: string): DomainResult {
  const normalized = message.trim().replace(/\s+/g, " ")
  if (!normalized || normalized.length > 2_000) {
    return { allowed: false, category: "unsupported", intent: "unsupported", confidence: 1 }
  }

  if (isAskAIGreeting(normalized)) {
    return { allowed: true, category: "avana", intent: "education", confidence: 0.99 }
  }

  if (matchesAny(normalized, RISK_PATTERNS)) {
    return { allowed: true, category: "position_risk", intent: "risk", confidence: 0.99 }
  }

  if (matchesAny(normalized, POSITION_PATTERNS)) {
    if (/\b(borrow another|borrow more|additional borrow|can i borrow|how much can i borrow)\b/i.test(normalized)) {
      return { allowed: true, category: "defi_lending", intent: "borrow_simulation", confidence: 0.98 }
    }
    if (matchesAny(normalized, STRESS_PATTERNS)) {
      return { allowed: true, category: "position_risk", intent: "stress_test", confidence: 0.98 }
    }
    if (/\b(risk|health factor|liquidat|ltv|buffer)\b/i.test(normalized)) {
      return { allowed: true, category: "position_risk", intent: "risk", confidence: 0.98 }
    }
    return { allowed: true, category: "avana", intent: "position", confidence: 0.97 }
  }

  if (matchesAny(normalized, POOL_PATTERNS)) {
    return {
      allowed: true,
      category: "dex_pool",
      intent: /\bcompare\b/i.test(normalized) ? "comparison" : "pool",
      confidence: 0.96,
    }
  }

  if (/\baave\b/i.test(normalized)) {
    return {
      allowed: true,
      category: "aave",
      intent: /\bcompare\b/i.test(normalized)
        ? "comparison"
        : matchesAny(normalized, EDUCATION_PATTERNS)
          ? "education"
          : "market",
      confidence: 0.97,
    }
  }

  if (matchesAny(normalized, MARKET_PATTERNS)) {
    return {
      allowed: true,
      category: "crypto_market",
      intent: /\bcompare\b/i.test(normalized) ? "comparison" : "market",
      confidence: 0.94,
    }
  }

  if (matchesAny(normalized, EDUCATION_PATTERNS)) {
    return {
      allowed: true,
      category: /\bavana\b/i.test(normalized) ? "avana" : "protocol_education",
      intent: "education",
      confidence: 0.94,
    }
  }

  return { allowed: true, category: "protocol_education", intent: "education", confidence: 0.5 }
}
