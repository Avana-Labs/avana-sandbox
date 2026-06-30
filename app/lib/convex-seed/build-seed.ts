/**
 * Deterministic seed-row builder for the Convex market data layer.
 *
 * This is the SINGLE source that turns the in-repo borrow catalog + engine into
 * the row shapes Convex stores (see convex/schema.ts). It is PURE and
 * deterministic (seeded by market slug) so the seed is reproducible and
 * unit-testable without a Convex connection. A thin runner
 * (scripts/seed-convex.mjs) imports this, then batches the rows into the generic
 * upsert mutations in convex/seed.ts.
 *
 * Slug contract (must match how the detail pages query Convex):
 *   - asset markets → slug = SpokeBorrowableRecord.id  (e.g. "uni-v2:usdc")
 *   - pool markets  → slug = BorrowPoolRow.id           (e.g. "uni-v2-weth-usdc")
 */

import { BORROW_POOL_CATALOG, type BorrowPoolRow } from "@/app/lib/borrow-sim"
import { listSpokeBorrowables, type SpokeBorrowableRecord } from "@/app/lib/borrow-system/registry"
import { prngFromString } from "@/app/lib/borrow-detail/prng"
import { computeAssetAllocationRows } from "@/app/lib/borrow-detail/allocation"
import { buildAssetRiskAssessment, buildLendRiskAssessment, buildMultiplyRiskAssessment, buildPoolRiskAssessment } from "@/app/lib/borrow-detail/risk-model"
import { buildAssetFaqs, buildLendFaqs, buildMultiplyFaqs, buildPoolFaqs } from "@/app/lib/borrow-detail/content-model"
import { getAssetAboutCard } from "@/app/lib/borrow-detail/asset.mock"
import { getPoolAboutCard } from "@/app/lib/borrow-detail/pool.mock"
import { LEND_MARKET_CATALOG } from "@/app/lib/lend-system/catalog"
import { MULTIPLY_MARKET_CATALOG } from "@/app/lib/multiply-system/catalog"
import type { LendMarket } from "@/app/lib/lend-engine/types"
import type { MultiplyMarketRecord } from "@/app/lib/multiply-engine/types"
import type { RiskAssessment } from "@/app/lib/borrow-detail/types"

const DAY_MS = 86_400_000

export type SeedMarketRow = {
  scope: "asset" | "pool" | "lend" | "multiply"
  slug: string
  chainId: number
  name: string
  symbol: string
  venueLabel?: string
  category?: "stable" | "crypto"
  description?: string
  iconUrl?: string
  spokeId?: string
  feeTier?: string
  maxLtvPct?: number
  visuals?: Array<{
    symbol: string
    shortLabel: string
    bgClassName: string
    textClassName: string
    iconUrl?: string
  }>
  resources?: Array<{ label: string; href: string }>
  createdAt: number
}

export type SeedDailyStatRow = {
  slug: string
  day: string
  suppliedUsd: number
  borrowedUsd: number
  utilizationPct: number
  supplyApyPct: number
  borrowAprPct: number
  tvlUsd: number
  volumeUsd: number
  feesUsd: number
  priceUsd?: number
}

export type SeedRevenueRow = {
  slug: string
  day: string
  interestFromBorrowersUsd: number
  interestToSuppliersUsd: number
  reserveTakeUsd: number
  rewardsDistributedUsd: number
  swapFeesUsd: number
}

export type SeedRiskRow = {
  slug: string
  assessedAt: number
  premiumBps: number
  level: "low" | "moderate" | "elevated" | "high"
  score: number
  headline: string
  summary: string
  breakdown: { id: string; label: string; bps: number; level: "low" | "moderate" | "elevated" | "high"; description: string }[]
  metrics: { id: string; label: string; value: string; hint?: string }[]
}

export type SeedWalletEventRow = {
  slug: string
  wallet: string
  kind: "supply" | "withdraw" | "borrow" | "repay"
  amountUsd: number
  txHash: string
  blockNumber: number
  at: number
}

/** One per (asset, pool) — the latest-day allocation snapshot. Keyed by both slugs;
 *  the push script resolves each to a `markets._id` before writing. */
export type SeedAllocationRow = {
  assetSlug: string
  poolSlug: string
  day: string
  valueUsd: number
  sharePct: number
  utilizationPct: number
  borrowAprPct: number
}

/** Static editorial content (About description + stats, parameter-change history, FAQs). */
export type SeedContentRow = {
  slug: string
  description: string
  stats: { label: string; value: string; href?: string }[]
  history: { date: string; title: string; description?: string }[]
  faqs: { question: string; answer: string }[]
}

export type SeedData = {
  markets: SeedMarketRow[]
  dailyStats: SeedDailyStatRow[]
  revenue: SeedRevenueRow[]
  risk: SeedRiskRow[]
  walletEvents: SeedWalletEventRow[]
  allocation: SeedAllocationRow[]
  content: SeedContentRow[]
}

export type BuildSeedOptions = {
  /** How many trailing daily rows to generate per market (drives 1Y/ALL chart depth). */
  days?: number
  /** End date (ms, UTC) of the daily window; defaults to "now". Pass a fixed value for reproducible tests. */
  asOf?: number
  /** Reserve factor applied to interest (supplier vs protocol split). */
  reserveFactor?: number
  /** Latest-day aggregate TVL targets the seed calibrates to (the canonical economy). */
  poolTvlTargetUsd?: number
  assetTvlTargetUsd?: number
}

const RESERVE_FACTOR_DEFAULT = 0.12

// Canonical economy aggregates (de-inflated). The raw catalog sums to ~$6.9B pools
// / ~$8.4B assets; the seed scales the latest day so the borrow hero reconciles to:
//   Total Collateral = pool TVL          = $1.6B
//   Outstanding Loans = asset TVL (≈ fully borrowed) = $700M
//   Available Credit  = collateral − loans = $900M
export const POOL_TVL_TARGET_USD = 1_600_000_000
export const ASSET_TVL_TARGET_USD = 700_000_000

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function round(value: number, dp = 2): number {
  const f = 10 ** dp
  return Math.round(value * f) / f
}

function schemaCategory(category: string): "stable" | "crypto" {
  return category === "stable" ? "stable" : "crypto"
}

/**
 * Deterministic daily walk producing REALISTIC market history (not a smooth line):
 * a mean-reverting random walk anchored to a gentle trend, textured with several
 * sine harmonics + per-step noise. `days` points ending at `asOf`, clamped
 * non-negative, seeded by `${slug}:${metric}` so it's reproducible and each market
 * looks distinct. `noise` here is the per-step volatility (random-walk step size).
 */
function dailyWalk(slug: string, metric: string, base: number, asOf: number, days: number, opts: { drift?: number; noise?: number; wave?: number } = {}): { day: string; value: number }[] {
  const rand = prngFromString(`${slug}:${metric}`)
  const drift = opts.drift ?? 1.06
  const volatility = opts.noise ?? 0.05
  const waveAmp = opts.wave ?? 0.07
  // Random phases so harmonics don't line up across markets.
  const phaseA = rand() * Math.PI * 2
  const phaseB = rand() * Math.PI * 2
  const phaseC = rand() * Math.PI * 2
  const out: { day: string; value: number }[] = []
  let level = base
  for (let i = 0; i < days; i++) {
    const progress = days <= 1 ? 1 : i / (days - 1)
    const target = base * (1 + (drift - 1) * progress)
    // Mean-revert toward the trend target, then take a volatile random step. This
    // produces realistic drifts and reversals instead of a monotonic climb.
    level += (target - level) * 0.08 + (rand() * 2 - 1) * base * volatility
    // Multi-frequency texture (slow swings + faster chop).
    const wave =
      base *
      waveAmp *
      (Math.sin(progress * Math.PI * 8 + phaseA) * 0.5 +
        Math.sin(progress * Math.PI * 23 + phaseB) * 0.32 +
        Math.sin(progress * Math.PI * 57 + phaseC) * 0.18)
    const value = Math.max(base * 0.05, level + wave)
    const day = isoDay(asOf - (days - 1 - i) * DAY_MS)
    out.push({ day, value })
  }
  return out
}

function poolMarketRow(pool: BorrowPoolRow, createdAt: number): SeedMarketRow {
  const [a, b] = pool.visuals
  return {
    scope: "pool",
    slug: pool.id,
    chainId: 1,
    name: pool.name,
    symbol: `${a?.symbol ?? "LP"}/${b?.symbol ?? "LP"}`,
    venueLabel: pool.venue,
    description: `${pool.name} liquidity position on ${pool.venue}.`,
    spokeId: pool.spoke,
    feeTier: pool.feeTier,
    maxLtvPct: pool.ltv,
    visuals: pool.visuals.map((visual) => ({
      symbol: visual.symbol,
      shortLabel: visual.shortLabel,
      bgClassName: visual.bgClass,
      textClassName: visual.textClass,
      iconUrl: visual.iconUrl,
    })),
    resources: [{ label: "Open market", href: `/borrow/markets/${pool.id}` }],
    createdAt,
  }
}

function assetMarketRow(asset: SpokeBorrowableRecord, createdAt: number): SeedMarketRow {
  return {
    scope: "asset",
    slug: asset.id,
    chainId: 1,
    name: asset.name,
    symbol: asset.symbol,
    category: schemaCategory(asset.category),
    description: asset.subtitle,
    iconUrl: asset.visual.iconUrl,
    spokeId: asset.spokeId,
    visuals: [
      {
        symbol: asset.visual.symbol,
        shortLabel: asset.visual.shortLabel,
        bgClassName: asset.visual.bgClass,
        textClassName: asset.visual.textClass,
        iconUrl: asset.visual.iconUrl,
      },
    ],
    resources: [{ label: "Open asset", href: `/borrow/assets/${asset.id}` }],
    createdAt,
  }
}

function lendMarketRow(market: LendMarket, createdAt: number): SeedMarketRow {
  return {
    scope: "lend",
    slug: market.marketId,
    chainId: market.chainId,
    name: market.asset.name,
    symbol: market.asset.symbol,
    // Low-tier lend markets are the stablecoins; everything else is volatile.
    category: market.riskTier === "low" ? "stable" : "crypto",
    description: `Supply ${market.asset.symbol} to the Avana lending market.`,
    resources: [{ label: "Open market", href: `/lend/markets/${market.marketId}` }],
    createdAt,
  }
}

/**
 * Daily stats for a lend (single-asset supply) market. Unlike the borrow asset/pool
 * generator, the supply APY is GIVEN by the catalog (walked around it) rather than
 * derived from a borrow rate; the borrow APR is back-derived for display only.
 */
function dailyStatsForLendMarket(
  slug: string,
  base: { suppliedUsd: number; utilizationPct: number; supplyApyPct: number; reserveFactor: number; priceUsd: number },
  asOf: number,
  days: number,
): SeedDailyStatRow[] {
  const supplied = dailyWalk(slug, "supplied", base.suppliedUsd, asOf, days, { drift: 1.06, noise: 0.04 })
  const util = dailyWalk(slug, "util", base.utilizationPct, asOf, days, { drift: 1.0, noise: 0.06, wave: 0.05 })
  const apy = dailyWalk(slug, "supplyapy", base.supplyApyPct, asOf, days, { drift: 1.0, noise: 0.05, wave: 0.04 })
  return supplied.map((s, i) => {
    const utilizationPct = Math.min(99, Math.max(1, round(util[i]!.value, 2)))
    const suppliedUsd = round(s.value, 0)
    const borrowedUsd = round((suppliedUsd * utilizationPct) / 100, 0)
    const supplyApyPct = round(Math.max(0.01, apy[i]!.value), 2)
    // Implied borrow APR from supply = borrow · utilization · (1 − reserveFactor).
    const borrowAprPct = round(supplyApyPct / Math.max(0.05, utilizationPct / 100) / Math.max(0.5, 1 - base.reserveFactor), 2)
    return {
      slug,
      day: s.day,
      suppliedUsd,
      borrowedUsd,
      utilizationPct,
      supplyApyPct,
      borrowAprPct,
      tvlUsd: suppliedUsd,
      volumeUsd: 0,
      feesUsd: round((borrowedUsd * borrowAprPct) / 100 / 365, 2),
      priceUsd: base.priceUsd,
    }
  })
}

function multiplyMarketRow(market: MultiplyMarketRecord, createdAt: number): SeedMarketRow {
  return {
    scope: "multiply",
    slug: market.id,
    chainId: 1,
    name: `${market.collateralAsset.symbol} / ${market.borrowAsset.symbol}`,
    symbol: market.collateralAsset.symbol,
    category: market.risk.riskTier === "low" ? "stable" : "crypto",
    description: `Multiply ${market.collateralAsset.symbol} exposure against ${market.borrowAsset.symbol}.`,
    resources: [{ label: "Open market", href: `/multiply/markets/${market.id}` }],
    createdAt,
  }
}

/**
 * Daily stats for a multiply (leveraged loop) market. "Supplied" is the market's
 * available loop liquidity (TVL); supply + borrow APY are both given by the catalog.
 */
function dailyStatsForMultiplyMarket(
  slug: string,
  base: { suppliedUsd: number; utilizationPct: number; supplyApyPct: number; borrowAprPct: number; priceUsd: number },
  asOf: number,
  days: number,
): SeedDailyStatRow[] {
  const supplied = dailyWalk(slug, "supplied", base.suppliedUsd, asOf, days, { drift: 1.05, noise: 0.05 })
  const util = dailyWalk(slug, "util", base.utilizationPct, asOf, days, { drift: 1.0, noise: 0.06, wave: 0.05 })
  const apy = dailyWalk(slug, "supplyapy", base.supplyApyPct, asOf, days, { drift: 1.0, noise: 0.05, wave: 0.04 })
  return supplied.map((s, i) => {
    const utilizationPct = Math.min(99, Math.max(1, round(util[i]!.value, 2)))
    const suppliedUsd = round(s.value, 0)
    const borrowedUsd = round((suppliedUsd * utilizationPct) / 100, 0)
    const supplyApyPct = round(Math.max(0.01, apy[i]!.value), 2)
    return {
      slug,
      day: s.day,
      suppliedUsd,
      borrowedUsd,
      utilizationPct,
      supplyApyPct,
      borrowAprPct: base.borrowAprPct,
      tvlUsd: suppliedUsd,
      volumeUsd: 0,
      feesUsd: round((borrowedUsd * base.borrowAprPct) / 100 / 365, 2),
      priceUsd: base.priceUsd,
    }
  })
}

function dailyStatsForMarket(
  slug: string,
  scope: "asset" | "pool",
  base: { suppliedUsd: number; utilizationPct: number; borrowAprPct: number },
  asOf: number,
  days: number,
): SeedDailyStatRow[] {
  const supplied = dailyWalk(slug, "supplied", base.suppliedUsd, asOf, days, { drift: 1.08, noise: 0.04 })
  const util = dailyWalk(slug, "util", base.utilizationPct, asOf, days, { drift: 1.0, noise: 0.06, wave: 0.05 })
  const apr = dailyWalk(slug, "apr", base.borrowAprPct, asOf, days, { drift: 1.0, noise: 0.05, wave: 0.04 })
  return supplied.map((s, i) => {
    const utilizationPct = Math.min(99, Math.max(1, round(util[i]!.value, 2)))
    const suppliedUsd = round(s.value, 0)
    const borrowedUsd = round((suppliedUsd * utilizationPct) / 100, 0)
    const borrowAprPct = round(Math.max(0.25, apr[i]!.value), 2)
    const supplyApyPct = round(borrowAprPct * (utilizationPct / 100) * 0.85, 2)
    const volumeUsd = scope === "pool" ? round(suppliedUsd * 0.12, 0) : 0
    const feesUsd = round((borrowedUsd * borrowAprPct) / 100 / 365, 2)
    return {
      slug,
      day: s.day,
      suppliedUsd,
      borrowedUsd,
      utilizationPct,
      supplyApyPct,
      borrowAprPct,
      tvlUsd: suppliedUsd,
      volumeUsd,
      feesUsd,
    }
  })
}

function revenueForMarket(stats: SeedDailyStatRow[], reserveFactor: number): SeedRevenueRow[] {
  return stats.map((row) => {
    const interestFromBorrowersUsd = round((row.borrowedUsd * row.borrowAprPct) / 100 / 365, 2)
    const reserveTakeUsd = round(interestFromBorrowersUsd * reserveFactor, 2)
    const interestToSuppliersUsd = round(interestFromBorrowersUsd - reserveTakeUsd, 2)
    return {
      slug: row.slug,
      day: row.day,
      interestFromBorrowersUsd,
      interestToSuppliersUsd,
      reserveTakeUsd,
      rewardsDistributedUsd: round(interestFromBorrowersUsd * 0.25, 2),
      swapFeesUsd: row.volumeUsd > 0 ? round(row.volumeUsd * 0.0005, 2) : 0,
    }
  })
}

const WALLET_EVENT_KINDS = ["supply", "borrow", "repay", "withdraw"] as const

function hex(rand: () => number, length: number): string {
  let out = ""
  while (out.length < length) out += Math.floor(rand() * 0xffffffff).toString(16).padStart(8, "0")
  return out.slice(0, length)
}

/** Size of the recurring per-market wallet pool (see walletEventsForMarket). */
const WALLET_POOL_SIZE = 14

/**
 * Deterministic per-market wallet activity over the trailing engagement window.
 * Drives convex/engagement.ts (distinct active wallets/day + the repay/borrow
 * conversion metric).
 *
 * Events are drawn from a small RECURRING wallet pool (not a fresh address per
 * event) so the same wallet emits multiple actions over time — e.g. a `supply`
 * then a `borrow`, or a `borrow` then a `repay`. That recurrence is what makes
 * the conversion KPI (computeConversionPct) a real aggregation instead of 0.
 */
function walletEventsForMarket(slug: string, asOf: number, days: number): SeedWalletEventRow[] {
  const rand = prngFromString(`${slug}:events`)
  const wallets = Array.from({ length: WALLET_POOL_SIZE }, () => `0x${hex(rand, 40)}`)
  const out: SeedWalletEventRow[] = []
  for (let d = days - 1; d >= 0; d--) {
    const dayStart = asOf - d * DAY_MS
    const count = 2 + Math.floor(rand() * 5) // 2–6 events/day
    for (let i = 0; i < count; i++) {
      out.push({
        slug,
        wallet: wallets[Math.floor(rand() * wallets.length)]!,
        kind: WALLET_EVENT_KINDS[Math.floor(rand() * WALLET_EVENT_KINDS.length)]!,
        amountUsd: round(rand() * 50_000, 2),
        txHash: `0x${hex(rand, 64)}`,
        blockNumber: 19_000_000 + Math.floor(rand() * 1_000_000),
        at: Math.floor(dayStart + rand() * DAY_MS),
      })
    }
  }
  return out
}

/**
 * Convert a computed `RiskAssessment` (from the shared risk-model — the same one
 * the UI mock uses) into the seed row shape. This is why the seeded risk has the
 * full breakdown + metrics instead of an empty stub.
 */
function riskRow(slug: string, assessedAt: number, assessment: RiskAssessment): SeedRiskRow {
  return {
    slug,
    assessedAt,
    premiumBps: assessment.premiumBps,
    level: assessment.level,
    score: assessment.score,
    headline: assessment.headline,
    summary: assessment.summary,
    breakdown: assessment.breakdown,
    metrics: assessment.metrics,
  }
}

/** Build the full deterministic seed for all borrow markets (assets + pools). */
export function buildBorrowSeed(options: BuildSeedOptions = {}): SeedData {
  const days = options.days ?? 365
  const asOf = options.asOf ?? Date.now()
  const reserveFactor = options.reserveFactor ?? RESERVE_FACTOR_DEFAULT
  const lastDay = isoDay(asOf)

  // Trailing window of wallet activity for the engagement card (covers the 12-day
  // engagement window in convex/engagement.ts with headroom).
  const walletEventDays = Math.min(days, 16)

  const markets: SeedMarketRow[] = []
  const dailyStats: SeedDailyStatRow[] = []
  const revenue: SeedRevenueRow[] = []
  const risk: SeedRiskRow[] = []
  const walletEvents: SeedWalletEventRow[] = []
  const allocation: SeedAllocationRow[] = []
  const content: SeedContentRow[] = []

  for (const pool of BORROW_POOL_CATALOG) {
    markets.push(poolMarketRow(pool, asOf))
    const utilizationPct = pool.tvlUsd > 0 ? Math.min(95, Math.max(5, round((pool.availableUsd / pool.tvlUsd) * 100, 2))) : 45
    const stats = dailyStatsForMarket(
      pool.id,
      "pool",
      { suppliedUsd: pool.tvlUsd, utilizationPct, borrowAprPct: (pool.aprMin + pool.aprMax) / 2 },
      asOf,
      days,
    )
    dailyStats.push(...stats)
    revenue.push(...revenueForMarket(stats, reserveFactor))
    risk.push(riskRow(pool.id, asOf, buildPoolRiskAssessment(pool)))
    walletEvents.push(...walletEventsForMarket(pool.id, asOf, walletEventDays))
    const poolAbout = getPoolAboutCard(pool)
    content.push({
      slug: pool.id,
      description: poolAbout.description,
      stats: poolAbout.stats,
      history: poolAbout.history,
      faqs: buildPoolFaqs(pool.name),
    })
  }

  for (const asset of listSpokeBorrowables()) {
    markets.push(assetMarketRow(asset, asOf))
    const suppliedUsd = asset.availableUsd + asset.totalBorrowedUsd
    const stats = dailyStatsForMarket(
      asset.id,
      "asset",
      { suppliedUsd, utilizationPct: asset.utilization, borrowAprPct: asset.borrowApr },
      asOf,
      days,
    )
    dailyStats.push(...stats)
    revenue.push(...revenueForMarket(stats, reserveFactor))
    risk.push(riskRow(asset.id, asOf, buildAssetRiskAssessment(asset)))
    walletEvents.push(...walletEventsForMarket(asset.id, asOf, walletEventDays))
    // Per-pool allocation shares (deterministic, shared with the UI mock). `valueUsd`
    // is filled in below from the CALIBRATED asset TVL so the breakdown sums to the
    // asset's reference value rather than the inflated raw catalog total.
    for (const r of computeAssetAllocationRows(asset)) {
      allocation.push({
        assetSlug: asset.id,
        poolSlug: r.pool.id,
        day: lastDay,
        valueUsd: 0,
        sharePct: r.sharePct,
        utilizationPct: r.utilizationPct,
        borrowAprPct: r.borrowAprPct,
      })
    }
    const assetAbout = getAssetAboutCard(asset)
    content.push({
      slug: asset.id,
      description: assetAbout.description,
      stats: assetAbout.stats,
      history: assetAbout.history,
      faqs: buildAssetFaqs(asset.symbol, asset.name),
    })
  }

  // Calibrate the latest day to the canonical economy aggregates. `dailyStats` and
  // `revenue` are built in lockstep (same index ↔ same market+day), so a single
  // per-index factor scales both. Utilization/APY are ratios and stay untouched.
  calibrateToTargets(markets, dailyStats, revenue, asOf, {
    poolTvlTargetUsd: options.poolTvlTargetUsd ?? POOL_TVL_TARGET_USD,
    assetTvlTargetUsd: options.assetTvlTargetUsd ?? ASSET_TVL_TARGET_USD,
  })

  // Anchor allocation values to the post-calibration per-asset supplied (latest day)
  // so the asset detail "Value" column reconciles with the headline TVL.
  const suppliedByAsset = new Map<string, number>()
  for (const row of dailyStats) {
    if (row.day === lastDay) suppliedByAsset.set(row.slug, row.suppliedUsd)
  }
  for (const row of allocation) {
    const supplied = suppliedByAsset.get(row.assetSlug) ?? 0
    row.valueUsd = round((supplied * row.sharePct) / 100, 0)
  }

  // Lend markets (single-asset supply). Added AFTER calibration so their catalog-scale
  // USD values aren't rescaled by the borrow economy targets. No pools → no allocation.
  for (const market of LEND_MARKET_CATALOG) {
    markets.push(lendMarketRow(market, asOf))
    const stats = dailyStatsForLendMarket(
      market.marketId,
      {
        suppliedUsd: Math.max(1, market.totalSupplied * market.assetPriceUsd),
        utilizationPct: Math.min(99, Math.max(1, market.utilization * 100)),
        supplyApyPct: Math.max(0.01, market.supplyApy * 100),
        reserveFactor: market.reserveFactor,
        priceUsd: market.assetPriceUsd,
      },
      asOf,
      days,
    )
    dailyStats.push(...stats)
    revenue.push(...revenueForMarket(stats, market.reserveFactor))
    risk.push(riskRow(market.marketId, asOf, buildLendRiskAssessment(market)))
    walletEvents.push(...walletEventsForMarket(market.marketId, asOf, walletEventDays))
    content.push({
      slug: market.marketId,
      description: `${market.asset.name} (${market.asset.symbol}) is a single-asset supply market on Avana. Deposit to earn the supply APY${market.rewardsApy > 0 ? " plus active rewards" : ""}, and withdraw available liquidity anytime. Yield tracks borrow demand and utilization.`,
      stats: [
        { label: "Risk tier", value: market.riskTier === "low" ? "Low" : market.riskTier === "medium" ? "Medium" : "High" },
        { label: "Reserve factor", value: `${(market.reserveFactor * 100).toFixed(0)}%` },
        { label: "Status", value: market.status === "active" ? "Active" : market.status === "capped" ? "Capped" : "Paused" },
      ],
      history: [
        { date: "2025-01-20", title: "Listed", description: `${market.asset.symbol} supply market opened.` },
        { date: "2025-09-08", title: "Parameters reviewed", description: "Quarterly risk review — reserve factor unchanged." },
      ],
      faqs: buildLendFaqs(market.asset.symbol, market.asset.name),
    })
  }

  // Multiply markets (leveraged loops). Like lend, appended after calibration so their
  // catalog-scale liquidity isn't rescaled by the borrow economy targets. No pools/allocation.
  for (const market of MULTIPLY_MARKET_CATALOG) {
    markets.push(multiplyMarketRow(market, asOf))
    const utilBase = market.risk.riskTier === "low" ? 68 : market.risk.riskTier === "medium" ? 58 : 48
    const stats = dailyStatsForMultiplyMarket(
      market.id,
      {
        suppliedUsd: Math.max(1, market.economics.availableLiquidityUsd),
        utilizationPct: utilBase,
        supplyApyPct: Math.max(0.01, market.economics.supplyApy * 100),
        borrowAprPct: Math.max(0.01, market.economics.borrowApy * 100),
        priceUsd: market.collateralAsset.priceUsd,
      },
      asOf,
      days,
    )
    dailyStats.push(...stats)
    revenue.push(...revenueForMarket(stats, reserveFactor))
    risk.push(riskRow(market.id, asOf, buildMultiplyRiskAssessment(market)))
    walletEvents.push(...walletEventsForMarket(market.id, asOf, walletEventDays))
    content.push({
      slug: market.id,
      description: `Multiply market pairing ${market.collateralAsset.name} (${market.collateralAsset.symbol}) collateral with ${market.borrowAsset.symbol} exposure in a leveraged loop, up to ${market.risk.publicMaxMultiplier.toFixed(2)}x. The route is dedicated to leveraged positions, separate from LP collateral pools.`,
      stats: [
        { label: "Collateral", value: market.collateralAsset.symbol },
        { label: "Borrowable", value: market.borrowAsset.symbol },
        { label: "Max leverage", value: `${market.risk.publicMaxMultiplier.toFixed(2)}x` },
        { label: "Risk tier", value: market.risk.riskTier === "low" ? "Low" : market.risk.riskTier === "medium" ? "Medium" : "High" },
      ],
      history: [
        { date: "2025-08-12", title: "Market listed", description: `${market.collateralAsset.symbol}/${market.borrowAsset.symbol} added to Multiply.` },
        { date: "2026-01-18", title: "Risk limits refreshed", description: "Updated leverage and availability parameters." },
      ],
      faqs: buildMultiplyFaqs(market.collateralAsset.symbol, market.borrowAsset.symbol),
    })
  }

  return { markets, dailyStats, revenue, risk, walletEvents, allocation, content }
}

function calibrateToTargets(
  markets: SeedMarketRow[],
  dailyStats: SeedDailyStatRow[],
  revenue: SeedRevenueRow[],
  asOf: number,
  targets: { poolTvlTargetUsd: number; assetTvlTargetUsd: number },
) {
  const lastDay = isoDay(asOf)
  const scopeBySlug = new Map(markets.map((m) => [m.slug, m.scope]))
  let poolLatest = 0
  let assetLatest = 0
  for (const row of dailyStats) {
    if (row.day !== lastDay) continue
    if (scopeBySlug.get(row.slug) === "pool") poolLatest += row.suppliedUsd
    else assetLatest += row.suppliedUsd
  }
  const poolFactor = poolLatest > 0 ? targets.poolTvlTargetUsd / poolLatest : 1
  const assetFactor = assetLatest > 0 ? targets.assetTvlTargetUsd / assetLatest : 1

  for (let i = 0; i < dailyStats.length; i++) {
    const stat = dailyStats[i]!
    const f = scopeBySlug.get(stat.slug) === "pool" ? poolFactor : assetFactor
    stat.suppliedUsd = round(stat.suppliedUsd * f, 0)
    stat.borrowedUsd = round(stat.borrowedUsd * f, 0)
    stat.tvlUsd = round(stat.tvlUsd * f, 0)
    stat.volumeUsd = round(stat.volumeUsd * f, 0)
    stat.feesUsd = round(stat.feesUsd * f, 2)
    const rev = revenue[i]
    if (rev) {
      rev.interestFromBorrowersUsd = round(rev.interestFromBorrowersUsd * f, 2)
      rev.interestToSuppliersUsd = round(rev.interestToSuppliersUsd * f, 2)
      rev.reserveTakeUsd = round(rev.reserveTakeUsd * f, 2)
      rev.rewardsDistributedUsd = round(rev.rewardsDistributedUsd * f, 2)
      rev.swapFeesUsd = round(rev.swapFeesUsd * f, 2)
    }
  }
}
