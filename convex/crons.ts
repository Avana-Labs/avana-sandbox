/**
 * Scheduled jobs.
 *   - refresh token prices from DefiLlama every 10 minutes so the sandbox "Price" tracks
 *     production and staleness surfaces within ~20m of a wedged cron (the batched request is cheap).
 *   - roll up daily market stats near end-of-day UTC: flush the running liquidity
 *     delta into a persistent `marketDailyStats` snapshot so the chart series grows
 *     over calendar time with real activity (seed = starting history only).
 *   - rebuild the shared liquidity-delta snapshot every 5 minutes so the app-wide
 *     `liquidity.listDeltaSnapshot` subscription reads one precomputed document
 *     instead of the append-only event table — one user's write no longer
 *     invalidates every other subscriber (cross-user staleness ≤ the interval).
 *   - compact the append-only liquidity deltas every 5 minutes: fold the oldest raw
 *     rows into the per-market `marketLiquidityBaseline` and delete them, so the fold
 *     input stays bounded (markets + recent window) no matter how many actions have
 *     accumulated — keeping the rebuild well under Convex's per-transaction scan limit.
 */

import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.interval("refresh token prices", { minutes: 10 }, internal.prices.refreshPrices, {})
// FX moves slowly (daily provider updates); hourly keeps the validated fiat layer fresh cheaply.
crons.interval("refresh fx rates", { hours: 1 }, internal.fx.refreshFxRates, {})
// Flush each market's running liquidity delta into a persistent daily snapshot near
// end-of-day UTC, so the chart series lengthens over calendar time with real activity
// (the seed is just the starting history). See `markets.rollupDailyStats`.
crons.daily("roll up daily market stats", { hourUTC: 23, minuteUTC: 55 }, internal.markets.rollupDailyStats, {})
// Compact BEFORE the snapshot rebuild so the rebuild folds the smaller post-compaction
// window. Both are idempotent on the total, so the ordering only affects work, not result.
crons.interval("compact liquidity deltas", { minutes: 5 }, internal.liquidity.compactDeltas, {})
crons.interval("rebuild liquidity snapshot", { minutes: 5 }, internal.liquidity.rebuildDeltaSnapshot, {})

// Ask AI market ingestion — refresh the server-side cache (`askAIMarketSnapshots`) that Ask AI's
// tools read. Ask AI never calls these providers per user request; it only reads this cache.
// Each source runs on its own staggered schedule so one provider's failure/429 cannot delay the
// others. Token prices stay on the canonical DefiLlama price cron above; these cover dex pools
// (Uniswap) and lending markets (Aave, which uses Aave's public keyless v3 API).
crons.cron("ask ai ingest uniswap pools", "3,18,33,48 * * * *", internal.askAIIngestion.ingest, { source: "uniswap" })
crons.cron("ask ai ingest aave markets", "9,24,39,54 * * * *", internal.askAIIngestion.ingest, { source: "aave" })
// Purge processed/failed Ask AI attachments past their retention TTL (and their storage objects).
crons.cron("ask ai purge expired attachments", "17 3 * * *", internal.askAIAttachments.purgeExpiredAttachments, {})

export default crons
