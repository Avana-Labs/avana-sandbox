import { getSwapAsset, getSwapPair } from "./catalog"
import type { SwapRestrictionReason } from "./contracts"

export type SwapQuoteStatus = "idle" | "loading" | "valid" | "stale" | "expired" | "unsupported" | "error"

export type SwapQuoteRequest = {
  walletId: string
  chainId: number
  inputAssetId: string
  outputAssetId: string
  inputAmount: number
  slippageBps: number
  requestedAt?: number
}

export type SwapQuote = {
  id: string
  status: SwapQuoteStatus
  provider: string
  chainId: number
  inputAssetId: string
  outputAssetId: string
  inputAmount: number
  estimatedOutputAmount: number
  minimumOutputAmount: number
  exchangeRate: number
  feeAmount: number
  feeBps: number
  priceImpactPct: number
  slippageBps: number
  networkFeeUsd: number
  expiresAt: number
  createdAt: number
  route: string[]
  rejectionReason?: SwapRestrictionReason
}

export type SwapProvider = {
  getQuote(request: SwapQuoteRequest): Promise<SwapQuote>
}

export type MockSwapProviderOptions = {
  now?: () => number
  quoteTtlMs?: number
  networkFeeUsd?: number
  priceImpactMultiplier?: number
}

const DEFAULT_QUOTE_TTL_MS = 30_000

function quoteId(request: SwapQuoteRequest, createdAt: number) {
  return `quote-${request.walletId}-${request.inputAssetId}-${request.outputAssetId}-${request.inputAmount}-${request.slippageBps}-${createdAt}`
}

function priceImpactPct(inputUsd: number, multiplier: number) {
  if (inputUsd <= 100) return 0.08 * multiplier
  if (inputUsd <= 1_000) return 0.35 * multiplier
  if (inputUsd <= 10_000) return 1.5 * multiplier
  return 5 * multiplier
}

export function getQuoteStatus(quote: SwapQuote, now = Date.now()) {
  if (quote.status !== "valid" && quote.status !== "stale") return quote.status
  return now >= quote.expiresAt ? "expired" : quote.status
}

export function isQuoteUsable(quote: SwapQuote, now = Date.now()) {
  return getQuoteStatus(quote, now) === "valid"
}

export function markQuoteStale(quote: SwapQuote): SwapQuote {
  if (quote.status !== "valid") return quote
  return { ...quote, status: "stale" }
}

export class MockSwapProvider implements SwapProvider {
  private readonly now: () => number
  private readonly quoteTtlMs: number
  private readonly networkFeeUsd: number
  private readonly priceImpactMultiplier: number

  constructor(options: MockSwapProviderOptions = {}) {
    this.now = options.now ?? Date.now
    this.quoteTtlMs = options.quoteTtlMs ?? DEFAULT_QUOTE_TTL_MS
    this.networkFeeUsd = options.networkFeeUsd ?? 0.24
    this.priceImpactMultiplier = options.priceImpactMultiplier ?? 1
  }

  async getQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    const createdAt = request.requestedAt ?? this.now()
    const pair = getSwapPair(request.inputAssetId, request.outputAssetId, request.chainId)
    const inputAsset = getSwapAsset(request.inputAssetId)
    const outputAsset = getSwapAsset(request.outputAssetId)

    if (!inputAsset || !outputAsset || !pair?.isEnabled || inputAsset.isLpToken || outputAsset.isLpToken) {
      return {
        id: quoteId(request, createdAt),
        status: "unsupported",
        provider: pair?.provider ?? "Avana mock router",
        chainId: request.chainId,
        inputAssetId: request.inputAssetId,
        outputAssetId: request.outputAssetId,
        inputAmount: request.inputAmount,
        estimatedOutputAmount: 0,
        minimumOutputAmount: 0,
        exchangeRate: 0,
        feeAmount: 0,
        feeBps: pair?.feeBps ?? 0,
        priceImpactPct: 0,
        slippageBps: request.slippageBps,
        networkFeeUsd: this.networkFeeUsd,
        expiresAt: createdAt,
        createdAt,
        route: [],
        rejectionReason: inputAsset?.isLpToken || outputAsset?.isLpToken ? "ineligible_lp_token" : "unsupported_pair",
      }
    }

    const grossOutputAmount = (request.inputAmount * inputAsset.priceUsd) / outputAsset.priceUsd
    const feeAmount = grossOutputAmount * (pair.feeBps / 10_000)
    const impact = priceImpactPct(request.inputAmount * inputAsset.priceUsd, this.priceImpactMultiplier)
    const impactAmount = grossOutputAmount * (impact / 100)
    const estimatedOutputAmount = Math.max(0, grossOutputAmount - feeAmount - impactAmount)
    const minimumOutputAmount = estimatedOutputAmount * (1 - request.slippageBps / 10_000)

    return {
      id: quoteId(request, createdAt),
      status: "valid",
      provider: pair.provider,
      chainId: request.chainId,
      inputAssetId: request.inputAssetId,
      outputAssetId: request.outputAssetId,
      inputAmount: request.inputAmount,
      estimatedOutputAmount,
      minimumOutputAmount,
      exchangeRate: estimatedOutputAmount / request.inputAmount,
      feeAmount,
      feeBps: pair.feeBps,
      priceImpactPct: impact,
      slippageBps: request.slippageBps,
      networkFeeUsd: this.networkFeeUsd,
      expiresAt: createdAt + this.quoteTtlMs,
      createdAt,
      route: [inputAsset.symbol, outputAsset.symbol],
    }
  }
}
