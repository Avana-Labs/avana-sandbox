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

const BLOCKED_PATTERNS = [
  /\b(nba|nfl|world cup|soccer score|sports score|baseball|basketball)\b/i,
  /\b(president|election|vote for|politic(?:s|al))\b/i,
  /\b(movie|celebrity|taylor swift|tv show|video game|call of duty)\b/i,
  /\b(flight|vacation|trip to|travel plan|hotel)\b/i,
  /\b(chicken recipe|recipe|cook(?:ing)?)\b/i,
  /\b(medical symptoms?|medicine should|diagnos(?:e|is))\b/i,
  /\b(divorce|legal contract|legal filing)\b/i,
  /\b(python scraper|react todo|write (?:me )?(?:a )?solidity|build (?:me )?(?:a )?(?:website|app))\b/i,
  /\b(capital of|world war|tell me a joke|write (?:me )?(?:a )?poem)\b/i,
  /\b(weather tomorrow|general news|today'?s stories)\b/i,
]

const INVESTMENT_RECOMMENDATION = /\b(what|which|should i|best)\b.{0,30}\b(buy|sell|invest(?:ment)?|crypto to own)\b/i

const POSITION_PATTERNS = [
  /\b(my|our)\b.{0,25}\b(position|positions|collateral|debt|borrow|health factor|ltv|liquidat)/i,
  /\b(show|analy[sz]e|compare)\b.{0,20}\b(my|our)\b/i,
  /\bhow much can i borrow\b/i,
  /\b(can i borrow|borrow another|borrow more|borrowing capacity|close am i to liquidation)\b/i,
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

const GREETING_PATTERN = /^(?:(?:good\s+)?(?:morning|afternoon|evening)|(?:hi|hello|hey|yo)(?:\s+there)?)[!.?\s]*$/i

export function isAskAIGreeting(message: string) {
  return GREETING_PATTERN.test(message.trim())
}

function matchesAny(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message))
}

/**
 * Deterministic mock classifier used for local development, tests, and as a hard
 * pre-filter before the live structured classifier. It intentionally handles the
 * product's known allow/block matrix; the live classifier adds semantic coverage.
 */
export function classifyAskAIDomain(message: string): DomainResult {
  const normalized = message.trim().replace(/\s+/g, " ")
  if (!normalized || normalized.length > 2_000) {
    return { allowed: false, category: "unsupported", intent: "unsupported", confidence: 1 }
  }

  if (matchesAny(normalized, BLOCKED_PATTERNS) || INVESTMENT_RECOMMENDATION.test(normalized)) {
    return { allowed: false, category: "unsupported", intent: "unsupported", confidence: 0.99 }
  }

  if (isAskAIGreeting(normalized)) {
    return { allowed: true, category: "avana", intent: "education", confidence: 0.99 }
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

  return { allowed: false, category: "unsupported", intent: "unsupported", confidence: 0.9 }
}
