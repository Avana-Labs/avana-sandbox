/**
 * Deterministic `LendMarketDetail` factory.
 *
 * Mirrors `borrow-detail/asset.mock.ts` and `multiply-detail` but for single-asset
 * supply markets. Every section is seeded by the market id so the output is stable
 * (same id in → same charts out). Risk and FAQs delegate to the shared builders
 * (`buildLendRiskAssessment`, `buildLendFaqs`) that the Convex seed also uses, so
 * the procedural fallback is byte-for-byte identical to seeded data.
 *
 * The Convex layer (`./convex-detail.ts`) passes `overrides` from the live snapshot
 * so the headline numbers match the list / hero; absent overrides, the catalog
 * values drive everything.
 */

import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { formatPct } from "@/app/lib/borrow-detail"
import { buildSeries, prngFromString } from "@/app/lib/borrow-detail/prng"
import { SANDBOX_NOW } from "@/app/lib/deterministic"
import { buildLendRiskAssessment } from "@/app/lib/borrow-detail/risk-model"
import { buildLendFaqs } from "@/app/lib/borrow-detail/content-model"
import { getLocalAssetIcon } from "@/app/lib/local-asset-icons"
import { LEND_MARKET_CATALOG, getLendMarketById, resolveLendMarketId } from "@/app/lib/lend-system/catalog"
import type { LendMarket } from "@/app/lib/lend-engine/types"
import type { AboutCard, CashflowCard, DeltaStat, QuickStat, TxHistoryRow } from "@/app/lib/borrow-detail"
import type { LendMarketDetail, LendMarketHero, LendMarketRelatedSummary, LendTokenVisual } from "./types"

/** Reference values from a Convex snapshot, threaded into the headline numbers. */
export type LendDetailOverrides = {
  suppliedUsd?: number
  borrowedUsd?: number
  availableUsd?: number
  utilizationPct?: number
  supplyApyPct?: number
  borrowAprPct?: number
}

const HERO_ANCHOR = SANDBOX_NOW

function deltaFromPct(pct: number): DeltaStat {
  if (pct === 0) return { value: 0, direction: "flat", label: "0.0%" }
  return pct > 0
    ? { value: pct, direction: "up", label: `+${pct.toFixed(1)}%` }
    : { value: pct, direction: "down", label: `${pct.toFixed(1)}%` }
}

function getVisual(symbol: string): LendTokenVisual {
  return {
    symbol,
    shortLabel: symbol.slice(0, 2).toUpperCase(),
    bgClass: "bg-surface-inset",
    textClass: "text-foreground",
    iconUrl: getLocalAssetIcon(symbol),
  }
}

type Reference = {
  price: number
  suppliedUsd: number
  borrowedUsd: number
  availableUsd: number
  utilizationPct: number
  supplyApyPct: number
  rewardsApyPct: number
  borrowAprPct: number
  reserveFactorPct: number
}

/** Resolve the headline reference values from the catalog, overlaid by Convex overrides. */
function resolveReference(market: LendMarket, overrides?: LendDetailOverrides): Reference {
  const price = market.assetPriceUsd
  const suppliedUsd = overrides?.suppliedUsd ?? Math.max(1, market.totalSupplied * price)
  const utilizationPct = clampPct(overrides?.utilizationPct ?? market.utilization * 100)
  const borrowedUsd = overrides?.borrowedUsd ?? (suppliedUsd * utilizationPct) / 100
  const availableUsd = overrides?.availableUsd ?? Math.max(0, suppliedUsd - borrowedUsd)
  const supplyApyPct = overrides?.supplyApyPct ?? market.supplyApy * 100
  const reserveFactorPct = market.reserveFactor * 100
  // Implied borrow APR from supply = borrow · utilization · (1 − reserveFactor).
  const borrowAprPct =
    overrides?.borrowAprPct ??
    supplyApyPct / Math.max(0.05, utilizationPct / 100) / Math.max(0.5, 1 - market.reserveFactor)
  return {
    price,
    suppliedUsd,
    borrowedUsd,
    availableUsd,
    utilizationPct,
    supplyApyPct,
    rewardsApyPct: market.rewardsApy * 100,
    borrowAprPct,
    reserveFactorPct,
  }
}

function clampPct(v: number): number {
  return Math.min(99, Math.max(0, v))
}

function buildHero(market: LendMarket): LendMarketHero {
  const isStable = market.riskTier === "low"
  return {
    visual: getVisual(market.asset.symbol),
    name: market.asset.name,
    symbol: market.asset.symbol,
    subtitle: `${market.asset.name} (${market.asset.symbol}) is a single-asset supply market on Avana — deposit to earn the supply APY${
      market.rewardsApy > 0 ? " plus active rewards" : ""
    }, with ${isStable ? "conservative stablecoin" : "tier-based"} risk parameters.`,
    chain: "Ethereum",
    category: isStable ? "stable" : "crypto",
    venue: "Avana Lend",
  }
}

function buildQuickStats(market: LendMarket, ref: Reference): QuickStat[] {
  return [
    { id: "price", label: "Price", value: formatUsdPrice(ref.price), delta: deltaFromPct(0.1) },
    {
      id: "available",
      label: "Available Liquidity",
      value: formatCompactUsd(ref.availableUsd),
      delta: deltaFromPct(0.6),
    },
    { id: "supplyApy", label: "Supply APY", value: formatPct(ref.supplyApyPct, 2), delta: deltaFromPct(0.1) },
    {
      id: "rewardsApy",
      label: "Rewards APY",
      value: ref.rewardsApyPct > 0 ? formatPct(ref.rewardsApyPct, 2) : "No rewards",
    },
    { id: "borrowApy", label: "Borrow APY", value: formatPct(ref.borrowAprPct, 2), delta: deltaFromPct(0.08) },
    { id: "reserveFactor", label: "Reserve Factor", value: formatPct(ref.reserveFactorPct, 0) },
  ]
}

function formatUsdPrice(value: number): string {
  return value >= 100
    ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${value.toFixed(2)}`
}

function buildSupplyBorrow(market: LendMarket, ref: Reference) {
  return {
    supplied: buildSeries(`lend:${market.marketId}:sb:supply`, "1Y", "Supplied", {
      base: ref.suppliedUsd,
      driftMultiplier: 1.12,
      noise: 0.04,
      nonNegative: true,
      roundTo: 0,
    }),
    borrowed: buildSeries(`lend:${market.marketId}:sb:borrow`, "1Y", "Borrowed", {
      base: ref.borrowedUsd,
      driftMultiplier: 1.09,
      noise: 0.05,
      nonNegative: true,
      roundTo: 0,
    }),
    utilization: buildSeries(`lend:${market.marketId}:sb:util`, "1Y", "Utilization", {
      base: Math.max(1, ref.utilizationPct),
      driftMultiplier: 1.02,
      noise: 0.05,
      nonNegative: true,
      roundTo: 2,
    }),
  }
}

function buildCashflow(market: LendMarket, ref: Reference): CashflowCard {
  const annualInterest = (ref.borrowedUsd * ref.borrowAprPct) / 100
  const toSuppliers = annualInterest * (1 - market.reserveFactor)
  const reserve = annualInterest * market.reserveFactor
  const rewards = (ref.suppliedUsd * ref.rewardsApyPct) / 100
  const feesSeries = buildSeries(`lend:${market.marketId}:cf:interest`, "1Y", "Interest", {
    base: annualInterest / 12,
    driftMultiplier: 1.04,
    noise: 0.08,
    nonNegative: true,
    roundTo: 0,
  })
  const rewardsSeries = buildSeries(`lend:${market.marketId}:cf:rewards`, "1Y", "Rewards", {
    base: rewards / 12,
    driftMultiplier: 1.05,
    noise: 0.18,
    nonNegative: true,
    roundTo: 0,
  })
  return {
    bars: [feesSeries, rewardsSeries],
    periodLabel: "Last 12 months",
    rows: [
      {
        label: "Interest paid by borrowers",
        reported: formatCompactUsd(annualInterest),
        yoy: deltaFromPct(13.4),
        highlighted: true,
      },
      { label: "To suppliers", reported: formatCompactUsd(toSuppliers), yoy: deltaFromPct(12.9) },
      { label: "Reserve", reported: formatCompactUsd(reserve), yoy: deltaFromPct(15.2) },
      { label: "Rewards distributed", reported: formatCompactUsd(rewards), yoy: deltaFromPct(4.1) },
      {
        label: "Net to suppliers",
        reported: formatCompactUsd(toSuppliers + rewards),
        yoy: deltaFromPct(11.8),
        highlighted: true,
      },
    ],
  }
}

function buildTransactions(market: LendMarket): TxHistoryRow[] {
  const rand = prngFromString(`lend:${market.marketId}:tx`)
  const kinds: TxHistoryRow["kind"][] = ["supply", "withdraw", "rewards", "supply", "withdraw", "supply"]
  const out: TxHistoryRow[] = []
  const now = HERO_ANCHOR
  for (let i = 0; i < 12; i++) {
    const kind = kinds[Math.floor(rand() * kinds.length)]!
    const amount = Math.round((5_000 + rand() * 180_000) / 100) * 100
    const ageMs = i * 31_000 + Math.floor(rand() * 6_000)
    const at = new Date(now - ageMs).toISOString()
    const walletAddress = `0x${Math.floor(rand() * 0xffffffff)
      .toString(16)
      .padStart(8, "0")}${Math.floor(rand() * 0xffffffff)
      .toString(16)
      .padStart(8, "0")}${Math.floor(rand() * 0xffffffff)
      .toString(16)
      .padStart(8, "0")}${Math.floor(rand() * 0xffffffff)
      .toString(16)
      .padStart(8, "0")}${Math.floor(rand() * 0xffffffff)
      .toString(16)
      .padStart(8, "0")}`
    const walletLabel = `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    out.push({
      id: `lend-${market.marketId}-tx-${i}`,
      at,
      timeLabel: formatRelativeAge(ageMs),
      kind,
      amountLabel: `${kind === "withdraw" ? "-" : "+"}${formatCompactUsd(amount)}`,
      walletLabel,
      walletHref: `https://etherscan.io/address/${walletAddress}`,
      txHashShort: `0x${Math.floor(rand() * 0xffffff)
        .toString(16)
        .padStart(6, "0")}…${Math.floor(rand() * 0xffff)
        .toString(16)
        .padStart(4, "0")}`,
    })
  }
  return out
}

function formatRelativeAge(ageMs: number) {
  const totalSeconds = Math.max(1, Math.floor(ageMs / 1000))
  if (totalSeconds < 60) return `${totalSeconds}s`
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) return `${totalHours}h`
  return `${Math.floor(totalHours / 24)}d`
}

function contractAddressFor(market: LendMarket, salt: string) {
  const seed = `${market.marketId}:${salt}`
  let hash = 0x811c9dc5
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  const chunk = (hash >>> 0).toString(16).padStart(8, "0").toUpperCase()
  return `0x${chunk}${chunk}${chunk}${chunk}${chunk}`.slice(0, 42)
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function buildContractStat(label: string, market: LendMarket, salt: string): AboutCard["stats"][number] {
  const address = contractAddressFor(market, salt)
  return {
    label,
    value: shortAddress(address),
    href: `https://etherscan.io/address/${address}`,
  }
}

function buildAbout(market: LendMarket): AboutCard {
  const isStable = market.riskTier === "low"
  return {
    description:
      `${market.asset.name} (${market.asset.symbol}) is a single-asset supply market on Avana. ` +
      `Suppliers earn the supply APY${market.rewardsApy > 0 ? " plus active rewards" : ""} from borrower interest, ` +
      `net of the reserve factor. Yield tracks utilization, so the page focuses on the live supply rate, the supply/utilization mix, and the latest risk posture for this ${
        isStable ? "stablecoin" : "tier-" + market.riskTier
      } market.`,
    stats: [
      buildContractStat("Vault Contract Address", market, "vault"),
      buildContractStat("Token Contract Address", market, "token"),
      buildContractStat("Staking Contract Address", market, "staking"),
      { label: "Deployed On", value: isStable ? "March 18, 2024" : "October 7, 2024" },
    ],
    history: [
      { date: "2025-01-20", title: "Listed", description: `${market.asset.symbol} supply market opened.` },
      {
        date: "2025-09-08",
        title: "Parameters reviewed",
        description: "Quarterly risk review — reserve factor unchanged.",
      },
    ],
  }
}

function buildRelated(market: LendMarket): LendMarketRelatedSummary[] {
  const peers = LEND_MARKET_CATALOG.filter((other) => other.marketId !== market.marketId)
  const sameTier = peers.filter((other) => other.riskTier === market.riskTier)
  const ordered = [...sameTier, ...peers.filter((other) => other.riskTier !== market.riskTier)]
  return ordered.slice(0, 4).map((other) => ({
    id: other.marketId,
    name: other.asset.name,
    symbol: other.asset.symbol,
    visual: getVisual(other.asset.symbol),
    apyLabel: formatPct(other.totalApy * 100, 2),
    availableLabel: formatCompactUsd(other.availableLiquidity * other.assetPriceUsd),
    utilizationPct: Math.round(other.utilization * 100),
  }))
}

// -------------------------------------------------------------------------
// Public
// -------------------------------------------------------------------------

/** Resolve a lend market by its route id (market id or asset symbol). */
export function resolveLendMarket(id: string): LendMarket | null {
  if (!id) return null
  const decoded = decodeURIComponent(id).trim()
  return getLendMarketById(decoded) ?? getLendMarketById(resolveLendMarketId(decoded))
}

/** Build the full deterministic detail for a lend market, optionally overlaying Convex reference values. */
export function buildLendMarketDetail(market: LendMarket, overrides?: LendDetailOverrides): LendMarketDetail {
  const ref = resolveReference(market, overrides)
  return {
    id: market.marketId,
    hero: buildHero(market),
    quickStats: buildQuickStats(market, ref),
    supplyBorrow: buildSupplyBorrow(market, ref),
    cashflow: buildCashflow(market, ref),
    risk: buildLendRiskAssessment(market),
    about: buildAbout(market),
    faqs: buildLendFaqs(market.asset.symbol, market.asset.name),
    transactions: buildTransactions(market),
    related: buildRelated(market),
    row: market,
  }
}

/** About card for seeding the Convex content layer (mirrors what the detail page renders). */
export function getLendAboutCard(market: LendMarket): AboutCard {
  return buildAbout(market)
}
