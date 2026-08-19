import { v } from "convex/values"
import { query } from "../_generated/server"
import type { QueryCtx } from "../_generated/server"
import { requireSandboxWallet } from "./auth"
import {
  SWAP_CHAIN_ID,
  SWAP_FEE_BPS,
  SWAP_NETWORK_FEE_USD,
  SWAP_PROVIDER,
  SWAP_QUOTE_TTL_MS,
  computeSwapQuoteMath,
  getSwapEngineAsset,
  isSwapPairRoutable,
} from "./swapQuoteEngine"

const DEFAULT_SLIPPAGE_BPS = 50

/** Resolve a swap leg's USD price: live oracle first, then the wallet's held price. Read-only. */
async function legPriceUsd(ctx: QueryCtx, wallet: string, assetId: string, symbol: string): Promise<number | null> {
  const oracle = await ctx.db
    .query("tokenPrices")
    .withIndex("by_symbol", (q) => q.eq("symbol", symbol.toLowerCase()))
    .first()
  if (oracle && oracle.priceUsd > 0 && oracle.status !== "invalid") return oracle.priceUsd
  const held = await ctx.db
    .query("sandboxBalances")
    .withIndex("by_wallet_asset", (q) => q.eq("wallet", wallet).eq("assetSlug", assetId))
    .unique()
  if (held?.priceUsd && held.priceUsd > 0) return held.priceUsd
  return null
}

/**
 * Authoritative swap quote, computed server-side from the live token oracle via the shared
 * engine (convex/sandbox/swapQuoteEngine.ts) — the same engine recordSwap executes with, so a
 * preview matches what the swap will actually do. Returns the client SwapQuote shape.
 */
export const getQuote = query({
  args: {
    wallet: v.string(),
    inputAssetId: v.string(),
    outputAssetId: v.string(),
    inputAmount: v.number(),
    slippageBps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const now = Date.now()
    const slippageBps = args.slippageBps ?? DEFAULT_SLIPPAGE_BPS
    const id = `quote-${wallet}-${args.inputAssetId}-${args.outputAssetId}-${args.inputAmount}-${slippageBps}-${now}`
    const input = getSwapEngineAsset(args.inputAssetId)
    const output = getSwapEngineAsset(args.outputAssetId)

    const base = {
      id,
      provider: SWAP_PROVIDER,
      chainId: SWAP_CHAIN_ID,
      inputAssetId: args.inputAssetId,
      outputAssetId: args.outputAssetId,
      inputAmount: args.inputAmount,
      slippageBps,
      networkFeeUsd: SWAP_NETWORK_FEE_USD,
      feeBps: SWAP_FEE_BPS,
      createdAt: now,
    }
    const empty = {
      ...base,
      estimatedOutputAmount: 0,
      minimumOutputAmount: 0,
      exchangeRate: 0,
      feeAmount: 0,
      priceImpactPct: 0,
      expiresAt: now,
      route: [] as string[],
    }

    if (!isSwapPairRoutable(args.inputAssetId, args.outputAssetId)) {
      return {
        ...empty,
        status: "unsupported" as const,
        rejectionReason: input?.isLpToken || output?.isLpToken ? "ineligible_lp_token" : "unsupported_pair",
      }
    }
    // `isSwapPairRoutable` guarantees both are defined here.
    const inputSymbol = input!.symbol
    const outputSymbol = output!.symbol

    const [inputPriceUsd, outputPriceUsd] = await Promise.all([
      legPriceUsd(ctx, wallet, args.inputAssetId, inputSymbol),
      legPriceUsd(ctx, wallet, args.outputAssetId, outputSymbol),
    ])
    if (!inputPriceUsd || !outputPriceUsd) {
      return { ...empty, status: "error" as const }
    }

    const math = computeSwapQuoteMath({ inputAmount: args.inputAmount, inputPriceUsd, outputPriceUsd, slippageBps })
    return {
      ...base,
      status: "valid" as const,
      estimatedOutputAmount: math.estimatedOutputAmount,
      minimumOutputAmount: math.minimumOutputAmount,
      exchangeRate: math.exchangeRate,
      feeAmount: math.feeAmount,
      priceImpactPct: math.priceImpactPct,
      expiresAt: now + SWAP_QUOTE_TTL_MS,
      route: [inputSymbol, outputSymbol],
    }
  },
})
