/**
 * Real token price oracle. A scheduled action pulls spot prices from DefiLlama
 * (free, no key) into the `tokenPrices` table; queries read them. This is the only
 * live-market data in the sandbox — supply/borrow/TVL stay simulated, but the
 * "Price" a user sees is the real production price, so the sandbox mimics prod.
 *
 * Flow: cron → refreshPrices (action, fetch) → upsertPrices (mutation) → getPrices (query).
 * Curve/Balancer pool-level depth would need a The Graph key; token prices don't.
 */

import { v } from "convex/values"
import { action, internalMutation, query } from "./_generated/server"
import { internal } from "./_generated/api"

/**
 * Base symbol (lowercase, = SpokeBorrowableRecord.baseAssetId) → DefiLlama coin id.
 * Addresses are Ethereum-mainnet; all 14 verified to resolve at confidence 0.99.
 */
export const TOKEN_LLAMA_IDS: Record<string, string> = {
  usdc: "ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  usdt: "ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7",
  dai: "ethereum:0x6B175474E89094C44Da98b954EedeAC495271d0F",
  weth: "ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  wbtc: "ethereum:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  crvusd: "ethereum:0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E",
  gho: "ethereum:0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f",
  eth: "coingecko:ethereum",
  steth: "ethereum:0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  wsteth: "ethereum:0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
  reth: "ethereum:0xae78736Cd615f374D3085123A210448E74Fc6393",
  eurc: "ethereum:0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c",
  cbeth: "ethereum:0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
  cbbtc: "ethereum:0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  aave: "coingecko:aave",
  uni: "coingecko:uniswap",
  crv: "coingecko:curve-dao-token",
}

/** All token prices (one row per base symbol). Small table — safe to collect. */
export const getPrices = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("tokenPrices").collect()
    return rows.map((r) => ({
      symbol: r.symbol,
      priceUsd: r.priceUsd,
      confidence: r.confidence,
      source: r.source,
      updatedAt: r.updatedAt,
    }))
  },
})

/** Upsert price rows by symbol. Called by the refresh action; not a public write. */
export const upsertPrices = internalMutation({
  args: {
    rows: v.array(
      v.object({
        symbol: v.string(),
        llamaId: v.string(),
        priceUsd: v.number(),
        decimals: v.optional(v.number()),
        confidence: v.optional(v.number()),
        source: v.string(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("tokenPrices")
        .withIndex("by_symbol", (q) => q.eq("symbol", row.symbol))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("tokenPrices", row)
    }
    return { written: rows.length }
  },
})

type LlamaResponse = {
  coins: Record<string, { price: number; decimals?: number; confidence?: number; symbol?: string }>
}

/**
 * Fetch current prices from DefiLlama and upsert them. Public so it can be run
 * manually (CLI / seed) to populate locally, and scheduled by the cron.
 */
export const refreshPrices = action({
  args: {},
  handler: async (ctx): Promise<{ written: number; fetched: number }> => {
    const entries = Object.entries(TOKEN_LLAMA_IDS)
    const ids = entries.map(([, id]) => id).join(",")
    const res = await fetch(`https://coins.llama.fi/prices/current/${encodeURIComponent(ids)}`)
    if (!res.ok) throw new Error(`DefiLlama request failed: ${res.status}`)
    const json = (await res.json()) as LlamaResponse
    const now = Date.now()
    const rows = entries
      .map(([symbol, llamaId]) => {
        const coin = json.coins[llamaId]
        if (!coin || typeof coin.price !== "number") return null
        return {
          symbol,
          llamaId,
          priceUsd: coin.price,
          decimals: coin.decimals,
          confidence: coin.confidence,
          source: "defillama",
          updatedAt: now,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
    await ctx.runMutation(internal.prices.upsertPrices, { rows })
    return { written: rows.length, fetched: Object.keys(json.coins).length }
  },
})
