/**
 * Scheduled jobs.
 *   - refresh token prices from DefiLlama hourly so the sandbox "Price" tracks
 *     production (token prices move slowly; the batched request is cheap).
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

crons.interval("refresh token prices", { hours: 1 }, internal.prices.refreshPrices, {})
// Compact BEFORE the snapshot rebuild so the rebuild folds the smaller post-compaction
// window. Both are idempotent on the total, so the ordering only affects work, not result.
crons.interval("compact liquidity deltas", { minutes: 5 }, internal.liquidity.compactDeltas, {})
crons.interval("rebuild liquidity snapshot", { minutes: 5 }, internal.liquidity.rebuildDeltaSnapshot, {})

export default crons
