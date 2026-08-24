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
import { internalAction, internalMutation, query } from "./_generated/server"
import { internal } from "./_generated/api"

/**
 * Base symbol (lowercase, = SpokeBorrowableRecord.baseAssetId) → DefiLlama coin id.
 * Must cover EVERY symbol the sandbox catalogs can display — any symbol missing here falls
 * back to the deterministic PRICE_FIXTURE, which drifts badly from reality for volatile
 * governance tokens (ARB, GNO, LDO, OP, BAL, AERO…). All ids verified to resolve at
 * confidence ≥ 0.99 (mainnet contract where the token lives on Ethereum, coingecko slug for
 * L2-native or non-ERC20 assets like BTC).
 */
export const TOKEN_LLAMA_IDS: Record<string, string> = {
  usdc: "ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  usdt: "ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7",
  dai: "ethereum:0x6B175474E89094C44Da98b954EedeAC495271d0F",
  weth: "ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  wbtc: "ethereum:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  btc: "coingecko:bitcoin",
  crvusd: "ethereum:0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E",
  gho: "ethereum:0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f",
  eth: "coingecko:ethereum",
  steth: "ethereum:0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  wsteth: "ethereum:0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
  reth: "ethereum:0xae78736Cd615f374D3085123A210448E74Fc6393",
  weeth: "ethereum:0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee",
  eurc: "ethereum:0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c",
  cbeth: "ethereum:0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
  cbbtc: "ethereum:0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  aave: "coingecko:aave",
  uni: "coingecko:uniswap",
  crv: "coingecko:curve-dao-token",
  // Governance / L2 tokens — fixture values here are wildly stale, so live coverage matters.
  arb: "coingecko:arbitrum",
  op: "coingecko:optimism",
  gno: "ethereum:0x6810e776880C02933D47DB1b9fc05908e5386b96",
  ldo: "ethereum:0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
  bal: "ethereum:0xba100000625a3754423978a60c9317c58a424e3D",
  aero: "coingecko:aerodrome-finance",
  // Stablecoins (≈ $1, but track the real depeg instead of a pinned fixture).
  usde: "coingecko:ethena-usde",
  frxusd: "coingecko:frax-usd",
  usdg: "coingecko:global-dollar",
  rlusd: "coingecko:ripple-usd",
}

/**
 * Freshness thresholds. The refresh cron runs every 10 minutes (see crons.ts): a row older than
 * one missed run (20m) is `stale`, and older than several (45m) is `invalid` — a wedged cron
 * surfaces quickly without false positives from a single network blip. A failed refresh writes
 * nothing, so old rows keep their old timestamp and age past these thresholds honestly.
 */
export const PRICE_REFRESH_INTERVAL_MS = 10 * 60 * 1000
export const PRICE_STALE_AFTER_MS = 20 * 60 * 1000
export const PRICE_INVALID_AFTER_MS = 45 * 60 * 1000

/** DefiLlama chain-name → EVM chainId, for parsing `chain:address` coin ids. */
const LLAMA_CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  optimism: 10,
  polygon: 137,
}

/** Parse a DefiLlama coin id into on-chain identity. coingecko-slug ids carry no contract. */
export function parseLlamaId(llamaId: string): { chainId?: number; contractAddress?: string } {
  const [chain, ref] = llamaId.split(":")
  if (!ref || chain === "coingecko") return {}
  const chainId = LLAMA_CHAIN_IDS[chain]
  if (ref.startsWith("0x")) return { chainId, contractAddress: ref.toLowerCase() }
  return chainId ? { chainId } : {}
}

/** Classify a price row's age against the freshness thresholds. */
export function classifyPriceStatus(ageMs: number): "fresh" | "stale" | "invalid" {
  if (ageMs >= PRICE_INVALID_AFTER_MS) return "invalid"
  if (ageMs >= PRICE_STALE_AFTER_MS) return "stale"
  return "fresh"
}

/**
 * Minimum DefiLlama `confidence` (0–1 scale) to accept a quote. Our tracked coins normally
 * resolve at 0.99; a value under this is a thin/unreliable quote we'd rather drop (and flag as
 * stale) than store as the authoritative price. Missing confidence is treated as acceptable.
 */
export const PRICE_MIN_CONFIDENCE = 0.8

/** All token prices (one row per base symbol). Small table — safe to collect. */
export const getPrices = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("tokenPrices").collect()
    return rows.map((r) => ({
      symbol: r.symbol,
      chainId: r.chainId,
      contractAddress: r.contractAddress,
      priceUsd: r.priceUsd,
      confidence: r.confidence,
      source: r.source,
      status: r.status,
      priceChange24hWad: r.priceChange24hWad,
      updatedAt: r.updatedAt,
    }))
  },
})

/**
 * Price freshness signal for the UI. If the refresh cron fails, `getPrices` keeps serving
 * the last-known values silently; this exposes the OLDEST row's last-refresh time so the UI
 * can warn ("prices may be stale") instead of presenting stale numbers as live.
 *
 * IMPORTANT: this returns only the raw `updatedAt` — it does NOT compute ageMs/stale from
 * Date.now(). A Convex query result is cached and only recomputed when a document it read
 * changes; a wall-clock-derived value would freeze the instant a client subscribed and never
 * flip fresh→stale until an unrelated `tokenPrices` write occurred (so a wedged cron would
 * never surface). The client derives ageMs/stale from `updatedAt` against a ticking clock
 * (see token-prices-context), so freshness advances with real time for connected clients.
 */
export const getPriceStatus = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("tokenPrices").collect()
    if (rows.length === 0) {
      // Never refreshed yet (fresh deploy, or the cron has never succeeded).
      return { updatedAt: null, staleAfterMs: PRICE_STALE_AFTER_MS, count: 0 }
    }
    // OLDEST row's timestamp: a partially-failed refresh is only as fresh as its stalest token.
    const updatedAt = Math.min(...rows.map((r) => r.updatedAt))
    return { updatedAt, staleAfterMs: PRICE_STALE_AFTER_MS, count: rows.length }
  },
})

/** Prices and freshness from one reactive table read for client-wide consumers. */
export const getPriceSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("tokenPrices").collect()
    const prices = rows.map((r) => ({
      symbol: r.symbol,
      priceUsd: r.priceUsd,
      confidence: r.confidence,
      source: r.source,
      updatedAt: r.updatedAt,
    }))
    const updatedAt = rows.length === 0 ? null : Math.min(...rows.map((r) => r.updatedAt))
    return {
      prices,
      status: { updatedAt, staleAfterMs: PRICE_STALE_AFTER_MS, count: rows.length },
    }
  },
})

/** Upsert price rows by symbol. Called by the refresh action; not a public write. */
export const upsertPrices = internalMutation({
  args: {
    rows: v.array(
      v.object({
        symbol: v.string(),
        llamaId: v.string(),
        chainId: v.optional(v.number()),
        contractAddress: v.optional(v.string()),
        priceUsd: v.number(),
        decimals: v.optional(v.number()),
        confidence: v.optional(v.number()),
        source: v.string(),
        sourceUpdatedAt: v.optional(v.number()),
        fetchedAt: v.optional(v.number()),
        snapshotAt: v.optional(v.number()),
        status: v.optional(v.union(v.literal("fresh"), v.literal("stale"), v.literal("invalid"))),
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

/** Copy the current oracle rows into one closing-price history point per UTC day. */
export const snapshotDailyTokenPrices = internalMutation({
  args: { day: v.optional(v.string()) },
  handler: async (ctx, { day: requestedDay }) => {
    const day = requestedDay ?? new Date().toISOString().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Token price history day must use YYYY-MM-DD")
    const prices = await ctx.db.query("tokenPrices").collect()
    const result = { inserted: 0, updated: 0, unchanged: 0 }
    for (const price of prices) {
      const existing = await ctx.db
        .query("tokenPricesHistory")
        .withIndex("by_symbol_day", (q) => q.eq("symbol", price.symbol).eq("day", day))
        .unique()
      if (!existing) {
        await ctx.db.insert("tokenPricesHistory", {
          symbol: price.symbol,
          day,
          priceUsd: price.priceUsd,
          updatedAt: price.updatedAt,
        })
        result.inserted += 1
      } else if (existing.priceUsd !== price.priceUsd) {
        await ctx.db.patch(existing._id, { priceUsd: price.priceUsd, updatedAt: price.updatedAt })
        result.updated += 1
      } else {
        result.unchanged += 1
      }
    }
    return result
  },
})

/** Historical daily price series for a token (charts). Separate from the current `getPrices`. */
export const getTokenPriceHistory = query({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const rows = await ctx.db
      .query("tokenPricesHistory")
      .withIndex("by_symbol_day", (q) => q.eq("symbol", symbol.toLowerCase()))
      .collect()
    return rows
      .map((r) => ({ day: r.day, priceUsd: r.priceUsd }))
      .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
  },
})

/**
 * Recompute POOL-market LP prices live from the token oracle: LPPriceUSD = Σ(weightᵢ × priceᵢ) over
 * the market's stored constituents. Keeps the server-side LP valuation (assertBorrowSolvent reads
 * markets.priceUsd) tracking the underlying token prices instead of a frozen seed value, so the
 * client preview (which values LP collateral live) and the server solvency check stay consistent.
 *
 * A pool with ANY unpriced/stale/invalid leg is SKIPPED (its priceUsd is left unchanged rather than
 * derived from incomplete data) — unavailable over wrong. Internal-only; run by the 10-min cron.
 */
export const refreshPoolLpPrices = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ updated: number; skipped: number }> => {
    const priceRows = await ctx.db.query("tokenPrices").collect()
    const priceBySymbol = new Map<string, { priceUsd: number; status?: string }>()
    for (const row of priceRows) {
      priceBySymbol.set(row.symbol.toLowerCase(), { priceUsd: row.priceUsd, status: row.status })
    }
    const poolMarkets = await ctx.db
      .query("markets")
      .withIndex("by_scope_slug", (q) => q.eq("scope", "pool"))
      .collect()
    let updated = 0
    let skipped = 0
    for (const market of poolMarkets) {
      const constituents = market.constituents
      if (!constituents || constituents.length === 0) {
        skipped++
        continue
      }
      let priceUsd = 0
      let usable = true
      for (const leg of constituents) {
        const quote = priceBySymbol.get(leg.symbol.toLowerCase())
        // Unpriced, non-positive, or invalid-status leg → the whole LP price is unavailable.
        if (!quote || !Number.isFinite(quote.priceUsd) || quote.priceUsd <= 0 || quote.status === "invalid") {
          usable = false
          break
        }
        priceUsd += leg.weight * quote.priceUsd
      }
      if (!usable || !(priceUsd > 0)) {
        skipped++
        continue
      }
      await ctx.db.patch(market._id, { priceUsd })
      updated++
    }
    return { updated, skipped }
  },
})

type LlamaResponse = {
  coins: Record<string, { price: number; decimals?: number; confidence?: number; symbol?: string; timestamp?: number }>
}

/**
 * Fetch current prices from DefiLlama and upsert them. Internal-only: invoked by the
 * cron (or the CLI via `npx convex run`); never publicly callable, so anonymous
 * callers can't trigger outbound fetches or price-table writes.
 *
 * Failures are logged with a greppable `[prices]` prefix and re-thrown so the scheduled
 * run is recorded as FAILED (observable/alertable in the Convex dashboard) rather than
 * silently leaving the UI on last-known values. `getPriceStatus` then surfaces staleness.
 */
export const refreshPrices = internalAction({
  args: {},
  handler: async (ctx): Promise<{ written: number; fetched: number }> => {
    const entries = Object.entries(TOKEN_LLAMA_IDS)
    const ids = entries.map(([, id]) => id).join(",")
    try {
      const res = await fetch(`https://coins.llama.fi/prices/current/${encodeURIComponent(ids)}`)
      if (!res.ok) throw new Error(`DefiLlama request failed: ${res.status}`)
      const json = (await res.json()) as LlamaResponse
      const now = Date.now()
      const rows = entries
        .map(([symbol, llamaId]) => {
          const coin = json.coins[llamaId]
          if (!coin) return null
          // Guard the STORED value: `typeof NaN === "number"` (and 0 / negatives are numbers),
          // so a plain type check lets insane quotes through to be stored as authoritative and
          // divided by downstream. Require a finite, strictly-positive USD price.
          if (!Number.isFinite(coin.price) || coin.price <= 0) return null
          // Reject shaky quotes. DefiLlama reports `confidence` on a 0–1 scale (our tracked
          // coins normally resolve at 0.99); anything under the threshold is too unreliable to
          // treat as the real price. Missing confidence is treated as acceptable so an omitted
          // field never empties the whole batch.
          if (typeof coin.confidence === "number" && coin.confidence < PRICE_MIN_CONFIDENCE) return null
          const { chainId, contractAddress } = parseLlamaId(llamaId)
          // DefiLlama returns per-coin `timestamp` in SECONDS; fall back to now when absent so a
          // provider that omits it never looks artificially ancient.
          const sourceUpdatedAt = typeof coin.timestamp === "number" ? coin.timestamp * 1000 : now
          return {
            symbol,
            llamaId,
            chainId,
            contractAddress,
            priceUsd: coin.price,
            decimals: coin.decimals,
            confidence: coin.confidence,
            source: "defillama",
            sourceUpdatedAt,
            fetchedAt: now,
            snapshotAt: now,
            status: classifyPriceStatus(Math.max(0, now - sourceUpdatedAt)),
            updatedAt: now,
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
      if (rows.length === 0) {
        // Fetch succeeded but yielded no usable prices — treat as a failure so the run is
        // flagged and the UI doesn't keep serving stale values as if the refresh worked.
        throw new Error("DefiLlama returned no usable prices")
      }
      await ctx.runMutation(internal.prices.upsertPrices, { rows })
      // Recompute pool LP prices from the freshly-written token prices × pool weights so the
      // server-side LP valuation tracks the oracle instead of a frozen seed value.
      await ctx.runMutation(internal.prices.refreshPoolLpPrices, {})
      return { written: rows.length, fetched: Object.keys(json.coins).length }
    } catch (err) {
      console.error("[prices] refreshPrices failed; UI will surface staleness via getPriceStatus:", err)
      throw err
    }
  },
})
