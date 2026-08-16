import { formatCompactUsd } from "@/app/lib/borrow-sim"
import type { ChartFeed } from "@/app/components/charts"
import {
  formatBpsAsPct,
  formatPct,
  riskLevelFromBps,
  riskLevelLabel,
  riskScoreFromBps,
  type AboutCard,
  type CashflowCard,
  type DeltaStat,
  type Point,
  type QuickStat,
  type RiskAssessment,
  type Series,
} from "@/app/lib/borrow-detail"
import { formatTokenPrice } from "@/app/lib/prices/format"
import { prngFromString } from "@/app/lib/borrow-detail/prng"
import { SANDBOX_NOW } from "@/app/lib/deterministic"
import {
  buildMultiplyAboutDescription,
  buildMultiplyFaqs,
  type FaqContent,
} from "@/app/lib/borrow-detail/content-model"
import { MULTIPLY_MARKET_ROWS, MULTIPLY_TOKEN_LOGOS, type MultiplyMarketRow } from "@/app/lib/multiply-sim"
import { getMultiplyMarketById } from "@/app/lib/multiply-system/catalog"
import { catalogMarketToRow } from "@/app/lib/multiply-system/read-model"
import { buildRiskParameterSet } from "@/app/lib/borrow-detail/risk-parameters"
import { resolveHeroContractAddress } from "@/app/borrow/_detail/lib/hero-chart-feeds"

export type MultiplyMarketHero = {
  visuals: [MultiplyTokenVisual, MultiplyTokenVisual]
  name: string
  venue: string
  subtitle: string
  feeTier?: string
  chain: string
  explorerUrl?: string
}

export type MultiplyTokenVisual = {
  symbol: string
  shortLabel: string
  bgClass: string
  textClass: string
  iconUrl?: string
}

export type MultiplyMarketDetail = {
  id: string
  hero: MultiplyMarketHero
  /** Convex-backed hero chart feed (TVL). Set only by the Convex builder; the hero
   * falls back to the local feed when absent. */
  heroFeed?: ChartFeed
  supplyBorrow: {
    supplied: Series
    borrowed: Series
    utilization: Series
  }
  cashflow: CashflowCard
  transactions: MultiplyTxHistoryRow[]
  quickStats: QuickStat[]
  risk: RiskAssessment
  about: AboutCard
  faqs: FaqContent[]
  row: MultiplyMarketRow
  /**
   * Liquidation Risk KPIs — from product-siloed `multiplyLiquidationDaily`.
   * @convex-query multiply.liquidationRisk.getLiquidationRisk
   */
  liquidationRisk?: import("../detail-page/liquidation-risk").LiquidationRiskStat[]
}

export type MultiplyTxHistoryRow = {
  id: string
  at: string
  timeLabel?: string
  kind: "open" | "add" | "reduce" | "close" | "interest" | "rebalance"
  amountLabel: string
  counterpartyLabel?: string
  walletLabel?: string
  walletHref?: string
  txHashShort: string
}

function deltaUp(pct: number): DeltaStat {
  return { value: pct, direction: "up", label: `+${pct.toFixed(1)}%` }
}

function deltaFromPct(pct: number): DeltaStat {
  if (pct === 0) return { value: 0, direction: "flat", label: "0.0%" }
  return pct > 0
    ? { value: pct, direction: "up", label: `+${pct.toFixed(1)}%` }
    : { value: pct, direction: "down", label: `${pct.toFixed(1)}%` }
}

function pickChain(collateral: string, borrowable: string) {
  const pair = `${collateral} ${borrowable}`.toLowerCase()
  if (pair.includes("wbtc") || pair.includes("cbbtc")) return "Bitcoin"
  if (
    pair.includes("usdc") ||
    pair.includes("usdt") ||
    pair.includes("dai") ||
    pair.includes("gho") ||
    pair.includes("crvusd")
  )
    return "Ethereum"
  if (pair.includes("aave") || pair.includes("uni") || pair.includes("crv")) return "Ethereum"
  return "Ethereum"
}

function buildQuickStats(row: MultiplyMarketRow, marketId: string): QuickStat[] {
  const record = getMultiplyMarketById(marketId)
  const price = record?.collateralAsset.priceUsd ?? 1
  const availableUsd = record?.economics.availableLiquidityUsd
  const available = row.points ?? (availableUsd != null ? formatCompactUsd(availableUsd) : "—")
  const supplyApyPct = (record?.economics.supplyApy ?? 0) * 100
  const borrowApyPct = (record?.economics.borrowApy ?? 0) * 100
  const reserveFactorPct = record?.risk.riskTier === "low" ? 10 : record?.risk.riskTier === "medium" ? 12 : 15
  // E7: the trending card headlines a leveraged loop APY, so the detail must surface the
  // same figure — not just the base supply APY. estimatedMaxApy is the single loop-APY
  // source (calculateMaxLeverageApy at the public max), kept in sync by market-hydration.
  const loopApyPct = (record?.economics.estimatedMaxApy ?? supplyApyPct / 100) * 100

  return [
    { id: "price", label: "Price", value: formatTokenPrice(price), delta: deltaFromPct(0.1) },
    { id: "available", label: "Available Liquidity", value: available, delta: deltaUp(1.4) },
    { id: "loopApy", label: "Max loop APY", value: formatPct(loopApyPct, 2), delta: deltaUp(1.1) },
    { id: "supplyApy", label: "Supply APY", value: formatPct(supplyApyPct, 2), delta: deltaFromPct(0.1) },
    { id: "rewardsApy", label: "Rewards APY", value: "No rewards" },
    { id: "borrowApy", label: "Borrow APY", value: formatPct(borrowApyPct, 2), delta: deltaFromPct(0.08) },
    { id: "reserveFactor", label: "Reserve Factor", value: formatPct(reserveFactorPct, 0) },
  ]
}

function buildHero(row: MultiplyMarketRow, marketId: string): MultiplyMarketHero {
  const address = resolveHeroContractAddress(marketId)
  return {
    visuals: [getVisual(row.protocol), getVisual(row.asset)],
    name: `${row.protocol} / ${row.asset}`,
    venue: "Avana Multiply",
    subtitle: `Use ${row.protocol} as collateral to multiply ${row.asset} exposure without changing the underlying structure.`,
    feeTier: `${row.apy} max APY`,
    chain: pickChain(row.protocol, row.asset),
    explorerUrl: `https://etherscan.io/address/${address}`,
  }
}

function getVisual(symbol: string): MultiplyTokenVisual {
  const key = symbol as keyof typeof MULTIPLY_TOKEN_LOGOS
  return {
    symbol,
    shortLabel: symbol.slice(0, 2).toUpperCase(),
    bgClass: "bg-surface-inset",
    textClass: "text-foreground",
    iconUrl: MULTIPLY_TOKEN_LOGOS[key],
  }
}

function buildSeries(seedKey: string, base: number, volatility: number): Series {
  const seed = prngFromString(seedKey)
  const points: Point[] = []
  let value = base
  const dayMs = 86_400_000
  for (let i = 0; i < 36; i += 1) {
    value = Math.max(0, value + (seed() - 0.5) * volatility)
    points.push({
      // End the series at the shared sandbox clock (so the range is recent),
      // walking 36 daily points backward from it.
      t: new Date(SANDBOX_NOW - (35 - i) * dayMs).toISOString(),
      v: Math.round(value),
    })
  }
  return {
    id: seedKey,
    label: seedKey,
    points,
    aggregate: points[points.length - 1]?.v ?? base,
    unit: "$",
  }
}

function buildSupplyBorrow(row: MultiplyMarketRow) {
  const seedBase = `multiply:${row.protocol}-${row.asset}`
  return {
    supplied: buildSeries(`${seedBase}:supplied`, 1_400_000, 90_000),
    borrowed: buildSeries(`${seedBase}:borrowed`, 860_000, 75_000),
    utilization: {
      ...buildSeries(`${seedBase}:utilization`, 48, 4.4),
      unit: "%",
    },
  }
}

function buildCashflow(seedBase: string, liquidityUsd: number, borrowApy: number): CashflowCard {
  const borrowedUsd = liquidityUsd * 0.6
  const annualInterest = borrowedUsd * borrowApy
  const reserve = annualInterest * 0.12
  const toSuppliers = annualInterest - reserve
  const rewards = liquidityUsd * 0.004
  return {
    bars: [
      {
        ...buildSeries(`${seedBase}:cf:interest`, Math.max(1, annualInterest / 12), Math.max(1, annualInterest / 120)),
        label: "Interest",
      },
      {
        ...buildSeries(`${seedBase}:cf:rewards`, Math.max(1, rewards / 12), Math.max(1, rewards / 60)),
        label: "Rewards",
      },
    ],
    periodLabel: "Last 12 months",
    rows: [
      { label: "Interest paid by borrowers", reported: formatCompactUsd(annualInterest), highlighted: true },
      { label: "To suppliers", reported: formatCompactUsd(toSuppliers) },
      { label: "Reserve", reported: formatCompactUsd(reserve) },
      { label: "Rewards distributed", reported: formatCompactUsd(rewards) },
      { label: "Net to suppliers", reported: formatCompactUsd(toSuppliers + rewards), highlighted: true },
    ],
  }
}

function buildRisk(row: MultiplyMarketRow): RiskAssessment {
  const leverage = row.rewardRows?.[0]?.value ? Number.parseFloat(row.rewardRows[0].value.replace("x", "")) : 1
  const premiumBps = Math.max(18, Math.round((leverage - 1) * 8 + (1 - row.collateralFactor) * 120))
  const level = riskLevelFromBps(premiumBps)
  const score = riskScoreFromBps(premiumBps)

  return {
    premiumBps,
    level,
    score,
    headline: `${riskLevelLabel(level)} risk · ${formatBpsAsPct(premiumBps)} premium`,
    summary: `${row.protocol}/${row.asset} inherits leverage risk from the borrow leg and price-movement risk from the collateral leg.`,
    breakdown: [
      {
        id: "leverage",
        label: "Leverage",
        bps: Math.round(premiumBps * 0.38),
        level,
        description: "Higher leverage magnifies both upside and liquidation speed.",
      },
      {
        id: "borrow",
        label: "Borrow APR",
        bps: Math.round(premiumBps * 0.2),
        level: "low",
        description: "Borrow cost moves with utilization and market stress.",
      },
      {
        id: "collateral",
        label: "Collateral factor",
        bps: Math.round(premiumBps * 0.2),
        level: "low",
        description: "The collateral leg sets how much buffer remains before liquidations.",
      },
      {
        id: "liquidity",
        label: "Available liquidity",
        bps: Math.round(premiumBps * 0.12),
        level: "low",
        description: "Available capital limits how much of the market can be opened at once.",
      },
      {
        id: "spread",
        label: "Spread / slippage",
        bps: Math.max(2, Math.round(premiumBps * 0.08)),
        level: "low",
        description: "Execution quality matters more as position size increases.",
      },
    ],
    metrics: [
      { id: "leverage", label: "Max leverage", value: row.rewardRows?.[0]?.value ?? "—" },
      { id: "collateralFactor", label: "Collateral factor", value: `${Math.round(row.collateralFactor * 100)}%` },
      { id: "lt", label: "Liquidation threshold", value: `${Math.round(row.liquidationThreshold * 100)}%` },
      { id: "liquidity", label: "Available", value: row.points ?? "—" },
    ],
  }
}

function buildGovernanceParameters(
  row: MultiplyMarketRow,
  marketId: string,
): NonNullable<AboutCard["governanceParameters"]> {
  const record = getMultiplyMarketById(marketId)
  const maxLtvPct = Math.round((record?.risk.maxLtv ?? row.collateralFactor) * 100)
  const liquidationThresholdPct = Math.round((record?.risk.liquidationThreshold ?? row.liquidationThreshold) * 100)
  const maxLeverage =
    record != null ? `${record.risk.publicMaxMultiplier.toFixed(2)}x` : (row.rewardRows?.[0]?.value ?? "—")
  const availableUsd = record?.economics.availableLiquidityUsd
  const supplyCapUsd = Math.max(25_000_000, Math.ceil(((availableUsd ?? 6_000_000) * 1.75) / 1_000_000) * 1_000_000)
  const liquidationBonusPct = record?.risk.riskTier === "low" ? 5 : record?.risk.riskTier === "medium" ? 6 : 7

  return {
    parameters: buildRiskParameterSet({
      collateralFactorPct: maxLtvPct,
      liquidationThresholdPct,
      depositCapacityLabel: formatCompactUsd(supplyCapUsd),
      borrowCapacityLabel: formatCompactUsd(Math.max(10_000_000, Math.round(supplyCapUsd * 0.45))),
      liquidationPenaltyPct: liquidationBonusPct,
      collateralFactorDescription: "Maximum borrow power against this multiply collateral leg.",
    }),
    // Changelog rows lost their governance proposal href when contractAddressFor was
    // removed. The Convex overlay in getMultiplyDetailFromConvex can add real hrefs
    // (from multiplyContractAddresses "governance" salt) in a follow-up if needed.
    changelog: [
      {
        id: "leverage-review",
        parameter: "Max leverage",
        previous: "—",
        current: maxLeverage,
        date: "2026-01-18",
        source: "Risk parameter review",
        executor: "Governance executor",
      },
      {
        id: "lt-review",
        parameter: "Liquidation threshold",
        previous: `${Math.max(0, liquidationThresholdPct - 2)}%`,
        current: `${liquidationThresholdPct}%`,
        date: "2025-09-08",
        source: "Risk parameter review",
        executor: "Risk steward multisig",
      },
      {
        id: "market-onboarding",
        parameter: "Collateral configuration",
        previous: "Disabled",
        current: `${maxLtvPct}% CF / ${liquidationThresholdPct}% LT`,
        date: "2025-08-12",
        source: "Market onboarding",
        executor: "Governance executor",
      },
    ],
  }
}

function buildAbout(row: MultiplyMarketRow, marketId: string): AboutCard {
  const record = getMultiplyMarketById(marketId)
  const collateralName = row.protocolName ?? record?.collateralAsset.name ?? row.protocol
  const borrowName = row.assetName ?? record?.borrowAsset.name ?? row.asset
  const maxLeverage =
    record != null ? `${record.risk.publicMaxMultiplier.toFixed(2)}x` : (row.rewardRows?.[0]?.value ?? "—")

  return {
    description: buildMultiplyAboutDescription({
      collateralName,
      collateralSymbol: row.protocol,
      borrowName,
      borrowSymbol: row.asset,
      maxLeverage,
      riskTier: record?.risk.riskTier,
    }),
    // Contract-address stats now injected at overlay time by getMultiplyDetailFromConvex
    // via api.contractAddresses.listMultiplyAddresses. The 3 seeded salts (vault/token/
    // staking) become AboutCard.stats rows there.
    stats: [],
    history: [
      {
        date: "2025-08-12",
        title: "Deployed",
        description: "Market contracts deployed.",
      },
      { date: "2025-08-12", title: "Market listed", description: `${row.protocol}/${row.asset} added to Multiply.` },
      {
        date: "2026-01-18",
        title: "Risk limits refreshed",
        description: "Updated leverage and availability parameters.",
      },
    ],
    governanceParameters: buildGovernanceParameters(row, marketId),
  }
}

function buildTransactions(row: MultiplyMarketRow): MultiplyTxHistoryRow[] {
  const seed = prngFromString(`multiply:${row.protocol}-${row.asset}:tx`)
  const kinds: MultiplyTxHistoryRow["kind"][] = ["open", "add", "reduce", "interest", "rebalance", "close"]
  const now = Date.now()
  const out: MultiplyTxHistoryRow[] = []

  for (let i = 0; i < 12; i += 1) {
    const kind = kinds[Math.floor(seed() * kinds.length)]
    const amountBase = kind === "interest" ? 150 + seed() * 4_500 : 40_000 + seed() * 1_250_000
    const amount = Math.round(amountBase / 100) * 100
    const ageMs = i * 34_000 + Math.floor(seed() * 8_000)
    const at = new Date(now - ageMs).toISOString()
    const prefix = kind === "reduce" || kind === "close" ? "-" : "+"
    const walletAddress = `0x${Math.floor(seed() * 0xffffffff)
      .toString(16)
      .padStart(8, "0")}${Math.floor(seed() * 0xffffffff)
      .toString(16)
      .padStart(8, "0")}${Math.floor(seed() * 0xffffffff)
      .toString(16)
      .padStart(8, "0")}${Math.floor(seed() * 0xffffffff)
      .toString(16)
      .padStart(8, "0")}${Math.floor(seed() * 0xffffffff)
      .toString(16)
      .padStart(8, "0")}`
    out.push({
      id: `${row.protocol}-${row.asset}-tx-${i}`,
      at,
      timeLabel: formatRelativeAge(ageMs),
      kind,
      amountLabel: `${prefix}${formatCompactUsd(amount)}`,
      counterpartyLabel: kind === "open" ? `${row.protocol} collateral` : undefined,
      walletLabel: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      walletHref: `https://etherscan.io/address/${walletAddress}`,
      txHashShort: `0x${Math.floor(seed() * 0xffffff)
        .toString(16)
        .padStart(6, "0")}…${Math.floor(seed() * 0xffff)
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

function resolveMultiplyRow(id: string): MultiplyMarketRow | null {
  const normalized = id.toLowerCase()
  const catalogMarket = getMultiplyMarketById(normalized)
  if (catalogMarket) return catalogMarketToRow(catalogMarket)

  return (
    MULTIPLY_MARKET_ROWS.find(
      (market) =>
        `${market.protocol}-${market.asset}`.toLowerCase() === normalized ||
        market.href.endsWith(`/multiply/markets/${normalized}`),
    ) ?? null
  )
}

export function getMultiplyMarketDetail(id: string): MultiplyMarketDetail | null {
  const row = resolveMultiplyRow(id)
  if (!row) return null

  const resolvedId = id.toLowerCase()
  const record = getMultiplyMarketById(resolvedId)
  const liquidityUsd = record?.economics.availableLiquidityUsd ?? 6_000_000
  const borrowApy = record?.economics.borrowApy ?? 0.04

  return {
    id: resolvedId,
    hero: buildHero(row, resolvedId),
    supplyBorrow: buildSupplyBorrow(row),
    cashflow: buildCashflow(`multiply:${row.protocol}-${row.asset}`, liquidityUsd, borrowApy),
    transactions: buildTransactions(row),
    quickStats: buildQuickStats(row, resolvedId),
    risk: buildRisk(row),
    about: buildAbout(row, resolvedId),
    faqs: buildMultiplyFaqs(row.protocol, row.asset),
    row,
  }
}
