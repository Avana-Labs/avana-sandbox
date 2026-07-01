/**
 * Scheduled jobs. Currently: refresh real token prices from DefiLlama hourly so the
 * sandbox "Price" tracks production. Token prices move slowly enough that hourly is
 * plenty; the action is cheap (one batched request for all base symbols).
 */

import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.interval("refresh token prices", { hours: 1 }, internal.prices.refreshPrices, {})

export default crons
