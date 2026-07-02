/**
 * Scheduled jobs.
 *   - refresh token prices from DefiLlama hourly so the sandbox "Price" tracks
 *     production (token prices move slowly; the batched request is cheap).
 *   - rebuild the shared liquidity-delta snapshot every minute so the app-wide
 *     `liquidity.listDeltaSnapshot` subscription reads one precomputed document
 *     instead of the append-only event table — one user's write no longer
 *     invalidates every other subscriber (cross-user staleness ≤ the interval).
 */

import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.interval("refresh token prices", { hours: 1 }, internal.prices.refreshPrices, {})
crons.interval("rebuild liquidity snapshot", { minutes: 1 }, internal.liquidity.rebuildDeltaSnapshot, {})

export default crons
