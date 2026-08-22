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
  /\b(my|our)\b.{0,40}\b(position|positions|wallet|balances?|holdings?|funds|assets?|collateral|debt|borrow|health factor|ltv|liquidat|umbrella|stake|staked|cooldown|withdraw|unstake)/i,
  /\bwhat(?:'s| is) in (?:my|our) wallet\b/i,
  /\b(show|analy[sz]e|compare)\b.{0,20}\b(my|our)\b/i,
  /\bhow much can i borrow\b/i,
  /\b(can i borrow|borrow another|borrow more|borrowing capacity|close am i to liquidation)\b/i,
  // First-person holdings without a literal "my" ("do I have a USDC balance?",
  // "how much ETH do I have", "I hold any GHO"). Kept in first-person + a
  // possession verb so it does not swallow general market questions.
  /\bdo (?:i|we) (?:have|own|hold|got)\b/i,
  /\b(?:how much|what|any).{0,40}\bdo (?:i|we) (?:have|own|hold)\b/i,
  /\b(?:i|we) (?:have|own|hold|holding|deposited|borrowed|staked)\b/i,
  /\b(?:cooldown|withdrawal window|ready to (?:withdraw|unstake)|can (?:i|we) (?:withdraw|unstake))\b/i,
]

const RISK_PATTERNS = [
  /\b(?:will|would|could|can|am|are)\s+(?:i|we)\s+(?:get\s+)?liquidat(?:ed|ion)?\b/i,
  /\b(?:my|our)\s+(?:liquidation|health factor|risk|ltv|buffer)\b/i,
  /\b(?:liquidation|health factor)\s+(?:risk|status|chance|probability)\b/i,
]

const STRESS_PATTERNS = [/\bwhat (?:happens|if)\b/i, /\b(stress|shock|drops?|falls?|depeg|price change)\b/i]

const POOL_PATTERNS = [
  /\b(pools?|liquidity|volume|fee tier|tick|in range|out of range|weighting|weights|lp yields?)\b/i,
  /\b(uniswap|curve|balancer|aerodrome|sushiswap|pancakeswap)\b/i,
]

const MARKET_PATTERNS = [
  /\b(eth|ethereum|weth|usdc|usdt|dai|wbtc|bitcoin|gho|aave|uni|uniswap|link|chainlink|crv|curve|token|asset)\b/i,
  /\b(price|worth|trading at|borrow rate|apr|apy|utilization|market)\b/i,
]

const TOKEN_PRICE_LOOKUP_PATTERN = /\b(price|prices|worth|quote|cost)\b/i

const EDUCATION_PATTERNS = [
  /\b(explain|what is|what does|how does|how might|how would|how could|why does|methodology|work)\b/i,
  /\b(avana|lp collateral|health factor|ltv|liquidation threshold|oracle|aave hub)\b/i,
]

const PROTOCOL_TOPIC_PATTERN =
  /\b(avana|aave|amm|apy|apr|borrow|collateral|crypto|defi|dex|health factor|impermanent loss|lend|liquidat|lp|ltv|market|oracle|pool|position|staking|stablecoin|token|uniswap|yield)\b/i

const GREETING_PATTERN =
  /^(?:(?:good\s+)?(?:morning|afternoon|evening)|(?:hi|hello|hey|yo|sup)(?:\s+(?:there|avana))?|what(?:'s| is)\s+up)[!.?\s]*$/i

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

  // An explicit token quote wins over a protocol name that also denotes a DEX.
  // Without this, "Uniswap token price" is misrouted as a pool lookup.
  if (matchesAny(normalized, MARKET_PATTERNS) && TOKEN_PRICE_LOOKUP_PATTERN.test(normalized)) {
    return { allowed: true, category: "crypto_market", intent: "market", confidence: 0.98 }
  }

  // Explanations about Avana's treatment of LPs, DEX positions, valuation, and
  // liquidation come from the protocol corpus, not from a live pool snapshot.
  if (
    matchesAny(normalized, EDUCATION_PATTERNS) &&
    /\b(avana|collateral|liquidat|oracle|valuation|value|health factor|ltv|position|positions)\b/i.test(normalized)
  ) {
    return {
      allowed: true,
      category: /\bavana\b/i.test(normalized) ? "avana" : "protocol_education",
      intent: "education",
      confidence: 0.97,
    }
  }

  if (matchesAny(normalized, POOL_PATTERNS)) {
    return {
      allowed: true,
      category: "dex_pool",
      intent: /\bcompare\b/i.test(normalized) ? "comparison" : "pool",
      confidence: 0.96,
    }
  }

  // Lookup language wins over the generic "what is" education pattern. This
  // keeps "What is the Aave token price right now?" on cached Convex data.
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

  if (matchesAny(normalized, EDUCATION_PATTERNS) && PROTOCOL_TOPIC_PATTERN.test(normalized)) {
    return {
      allowed: true,
      category: /\bavana\b/i.test(normalized) ? "avana" : "protocol_education",
      intent: "education",
      confidence: 0.94,
    }
  }

  return { allowed: true, category: "unsupported", intent: "unsupported", confidence: 0.5 }
}

/**
 * The eight tools registered on the Ask AI agent. A turn is routed to the
 * smallest subset that can answer it, so a price question never loads the
 * portfolio/risk tools and a personal question never loads web search.
 */
export type AskAIToolName =
  | "web_search"
  | "search_avana_knowledge"
  | "read_portfolio"
  | "read_borrow_capacity"
  | "read_position_risk"
  | "simulate_borrow"
  | "stress_position"
  | "search_markets"
  | "read_pool_metrics"

export type AskAIModelTier = "fast" | "reasoning"

export type AskAITurnRoute = {
  category: AskAIDomainCategory
  intent: AskAIIntent
  confidence: number
  /** The only tools the model may call this turn (AI SDK `activeTools`). */
  tools: AskAIToolName[]
  /** "none" when no tools are needed, so the model answers in a single step. */
  toolChoice: "auto" | "none" | { type: "tool"; toolName: AskAIToolName }
  /** Upper bound on tool/generation steps (AI SDK `stopWhen`). */
  maxSteps: number
  /** Cheap model for simple lookups; the reasoning model for risk analysis. */
  modelTier: AskAIModelTier
}

export function toolChoiceForAskAIStep(route: AskAITurnRoute, stepNumber: number): AskAITurnRoute["toolChoice"] {
  if (stepNumber === 0) return route.toolChoice
  return route.tools.length > 0 ? "auto" : "none"
}

// Only turn on web search when the user is clearly asking about recent public
// events. Prices, pools, balances, and risk are answered from Convex data — web
// search is never a substitute for a Convex tool (see agent-instructions.ts).
const NEWS_EVENT_PATTERN =
  /\b(news|headline|headlines|announc(?:e|ed|ement|ing)|breaking|event|events|what happened|happening this week)\b/i

/**
 * Deterministic, zero-cost turn router. Topic scope (politely redirecting
 * clearly-unrelated asks) is owned by the agent instructions, NOT here — this
 * function only decides how much machinery a turn is allowed to spend.
 */
export function routeAskAITurn(message: string): AskAITurnRoute {
  const { category, intent, confidence } = classifyAskAIDomain(message)
  const normalized = message.trim()
  const wantsNewsOrEvents = NEWS_EVENT_PATTERN.test(normalized)

  const plan = (tools: AskAIToolName[], maxSteps: number, modelTier: AskAIModelTier): AskAITurnRoute => ({
    category,
    intent,
    confidence,
    tools,
    toolChoice: tools.length === 1 ? { type: "tool", toolName: tools[0] } : tools.length > 1 ? "auto" : "none",
    maxSteps,
    modelTier,
  })

  // Greetings and bare clarifications need no tools at all — answer in one step.
  if (isAskAIGreeting(normalized) || isAskAIClarificationPrompt(normalized)) return plan([], 1, "fast")
  if (wantsNewsOrEvents) return plan(["web_search"], 2, "fast")

  switch (intent) {
    case "position":
      // A balance/holdings question needs only the portfolio read.
      return plan(["read_portfolio"], 2, "fast")
    case "risk":
      return plan(["read_position_risk"], 2, "reasoning")
    case "borrow_simulation":
      if (/\b(how much can i borrow|borrowing capacity)\b/i.test(normalized))
        return plan(["read_borrow_capacity"], 2, "reasoning")
      return plan(["read_borrow_capacity", "simulate_borrow"], 3, "reasoning")
    case "stress_test":
      return plan(["read_position_risk", "stress_position"], 4, "reasoning")
    case "pool":
      return plan(["search_markets"], 2, "fast")
    case "market":
      // A price/rate question needs only the market search.
      return plan(["search_markets"], 2, "fast")
    case "comparison":
      return plan(["search_markets"], 2, "fast")
    case "education":
      return plan(["search_avana_knowledge"], 2, "fast")
    case "unsupported":
    default:
      // Let the model answer briefly from its own knowledge (or redirect per the
      // instructions); only grant web search when the ask is clearly time-sensitive.
      return plan([], 1, "fast")
  }
}
