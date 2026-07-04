/**
 * Seed the Convex market data layer for all borrow markets.
 *
 *   npx tsx scripts/seed-convex.ts --dry-run     # build rows + print counts, no network
 *   npx tsx scripts/seed-convex.ts               # push to NEXT_PUBLIC_CONVEX_URL (idempotent)
 *   npx tsx scripts/seed-convex.ts --days 90     # shorter daily window (fewer rows)
 *
 * Requires the Convex functions to be deployed first (`npx convex deploy`). All
 * writes are idempotent upserts, so re-running is safe.
 */

import { ConvexHttpClient } from "convex/browser"
import { api } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"
import { buildBorrowSeed } from "../app/lib/convex-seed/build-seed"

const BATCH = 400

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const dryRun = process.argv.includes("--dry-run")
// Push ONLY the `markets` table (173 rows) and stop — for cheap idempotent updates to
// market-level fields (e.g. the onboarding `priceUsd`) without re-pushing the 46k+ daily
// rows. All other tables are unchanged by such updates.
const marketsOnly = process.argv.includes("--markets-only")
const days = Number(arg("days") ?? 365)

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}

// Throttle between batches to stay under Convex's write-rate cap (4 MiB/s on the
// dev/local deployment). Tunable via --throttle <ms>.
const throttleMs = Number(arg("throttle") ?? 70)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  const seed = buildBorrowSeed({ days })
  console.log(
    `[seed] built ${seed.markets.length} markets · ${seed.dailyStats.length} daily stats · ${seed.revenue.length} revenue · ${seed.risk.length} risk · ${seed.allocation.length} allocation · ${seed.content.length} content (days=${days})`,
  )
  if (dryRun) {
    console.log("[seed] --dry-run: not writing. Sample market:", JSON.stringify(seed.markets[0]))
    return
  }

  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url || !/^https?:\/\//.test(url)) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set to a reachable deployment (check .env.local).")
  }
  const seedSecret = process.env.CONVEX_SEED_SECRET
  if (!seedSecret) {
    throw new Error("CONVEX_SEED_SECRET is not set. Set it locally and in the Convex deployment.")
  }
  const client = new ConvexHttpClient(url)

  // 1) Markets → collect slug → _id
  const idsBySlug: Record<string, Id<"markets">> = {}
  for (const batch of chunk(seed.markets, BATCH)) {
    const res = (await client.action(api.seedAdmin.upsertMarkets, { seedSecret, rows: batch })) as {
      idsBySlug: Record<string, Id<"markets">>
    }
    Object.assign(idsBySlug, res.idsBySlug)
  }
  console.log(`[seed] upserted ${Object.keys(idsBySlug).length} markets`)

  if (marketsOnly) {
    const counts = await client.action(api.seedAdmin.getCounts, { seedSecret })
    console.log("[seed] --markets-only: done. Convex counts:", JSON.stringify(counts))
    return
  }

  const withMarketId = <T extends { slug: string }>(rows: T[]) =>
    rows
      .map(({ slug, ...rest }) => {
        const marketId = idsBySlug[slug]
        return marketId ? { marketId, ...rest } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

  // 2) Daily stats
  let n = 0
  for (const batch of chunk(withMarketId(seed.dailyStats), BATCH)) {
    await client.action(api.seedAdmin.upsertDailyStats, { seedSecret, rows: batch })
    n += batch.length
    await sleep(throttleMs)
  }
  console.log(`[seed] upserted ${n} daily stats`)

  // 2b) Rebuild the listMarketSnapshots cache once from the freshly-landed markets +
  // daily stats (the subscribed hot query reads this single doc, not ~173 rows).
  await client.action(api.seedAdmin.rebuildMarketSnapshots, { seedSecret })
  console.log("[seed] rebuilt market snapshots cache")

  // 3) Revenue
  n = 0
  for (const batch of chunk(withMarketId(seed.revenue), BATCH)) {
    await client.action(api.seedAdmin.upsertRevenue, { seedSecret, rows: batch })
    n += batch.length
    await sleep(throttleMs)
  }
  console.log(`[seed] upserted ${n} revenue rows`)

  // 4) Risk
  for (const batch of chunk(withMarketId(seed.risk), BATCH)) {
    await client.action(api.seedAdmin.upsertRisk, { seedSecret, rows: batch })
    await sleep(throttleMs)
  }
  console.log(`[seed] upserted ${seed.risk.length} risk assessments`)

  // 5) Wallet events (engagement) — clear then insert so re-seeds stay idempotent.
  let cleared = 0
  for (;;) {
    const res = (await client.action(api.seedAdmin.clearWalletEvents, { seedSecret })) as { deleted: number }
    cleared += res.deleted
    if (res.deleted === 0) break
    await sleep(throttleMs)
  }
  let events = 0
  for (const batch of chunk(withMarketId(seed.walletEvents), BATCH)) {
    await client.action(api.seedAdmin.insertWalletEvents, { seedSecret, rows: batch })
    events += batch.length
    await sleep(throttleMs)
  }
  console.log(`[seed] wallet events: cleared ${cleared}, inserted ${events}`)

  // 6) Allocation (per-asset → pool split) — maps BOTH slugs to market ids.
  const allocationRows = seed.allocation
    .map(({ assetSlug, poolSlug, ...rest }) => {
      const assetId = idsBySlug[assetSlug]
      const poolId = idsBySlug[poolSlug]
      return assetId && poolId ? { assetId, poolId, ...rest } : null
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
  let alloc = 0
  for (const batch of chunk(allocationRows, BATCH)) {
    await client.action(api.seedAdmin.upsertAllocation, { seedSecret, rows: batch })
    alloc += batch.length
    await sleep(throttleMs)
  }
  console.log(`[seed] upserted ${alloc} allocation rows`)

  // 7) Market content (about / stats / parameter-change history / FAQs)
  let cont = 0
  for (const batch of chunk(withMarketId(seed.content), BATCH)) {
    await client.action(api.seedAdmin.upsertContent, { seedSecret, rows: batch })
    cont += batch.length
    await sleep(throttleMs)
  }
  console.log(`[seed] upserted ${cont} content rows`)

  const counts = await client.action(api.seedAdmin.getCounts, { seedSecret })
  console.log("[seed] done. Convex counts:", JSON.stringify(counts))
}

main().catch((err) => {
  console.error("[seed] failed:", err)
  process.exit(1)
})
