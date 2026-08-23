import { v } from "convex/values"
import { ASK_AI_CONFIG, ASK_AI_WALLET_REQUIRED } from "../app/lib/ask-ai/config"
import type { AskAIMarketSource } from "../app/lib/ask-ai/providers/contracts"
import {
  calculateLendProjection,
  calculateAskAIBorrowSimulation,
  calculateAskAICollateralStress,
  calculateMultiplyStress,
  decodeBorrowRiskSnapshot,
  deriveAskAIUmbrellaStatus,
} from "../app/lib/ask-ai/engine-calculations"
import { internalQuery, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { getAuthedWallet } from "./sandbox/auth"
import type { Id } from "./_generated/dataModel"

type PortfolioReadCtx = Pick<QueryCtx | MutationCtx, "auth" | "db">

function withTurnWallet(ctx: Pick<QueryCtx, "db">, wallet?: string): PortfolioReadCtx {
  return {
    db: ctx.db,
    auth: {
      getUserIdentity: async () =>
        ({
          subject: wallet ?? "ask-guest:scheduled",
          ...(wallet ? { wallet } : {}),
        }) as Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>,
    },
  }
}

async function readRunningTurnWallet(ctx: Pick<QueryCtx, "db">, turnId: Id<"askAITurns">) {
  const turn = await ctx.db.get(turnId)
  if (!turn || turn.status !== "running") throw new Error("Ask AI turn is not running")
  return turn.wallet
}

/**
 * Provenance of the financial figures every Ask AI portfolio/risk tool returns.
 * Lane B passes this straight through into `richParts.financialResults[].dataProvenance`.
 *
 * This is a sandbox-first app. All portfolio, borrow, risk, and position data read
 * by these tools is written by the synthetic sandbox onboarding/transaction flow
 * (see convex/sandbox/onboarding.ts: "Balances/prices here are SYNTHETIC sandbox
 * values, not a source of truth"). No table (positions, walletLendBalances,
 * riskSnapshots, sandboxProfiles, ...) carries a per-record signal that would
 * distinguish a synthetic sandbox balance from a real connected-wallet balance or
 * an on-chain read, and there is no on-chain/connected-wallet read path feeding
 * these tables today. The authed wallet is derived from the SIWE/Privy identity but
 * only scopes access — it does not imply the data is real holdings. So the only
 * honest value we can return is "sandbox".
 *
 * TODO: when a real connected-wallet or on-chain data path lands, thread the true
 * source through here — e.g. a per-record origin flag stamped by the writer — and
 * return "connected_wallet" / "onchain" per record instead of this constant.
 */
const ASK_AI_DATA_PROVENANCE: "sandbox" | "connected_wallet" | "onchain" = "sandbox"

export async function readAskAIPortfolio(ctx: PortfolioReadCtx) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }

  const [lend, borrow, multiply, liquid, umbrella, umbrellaTranches] = await Promise.all([
    ctx.db
      .query("walletLendBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("walletBorrowBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("walletMultiplyBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("walletLiquidBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("positions")
      .withIndex("by_wallet_product", (q) => q.eq("wallet", wallet).eq("product", "umbrella"))
      .collect(),
    ctx.db
      .query("umbrellaCooldownTranches")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
  ])

  const sumUsd = (rows: readonly { valueUsd: number }[]) => rows.reduce((sum, row) => sum + row.valueUsd, 0)
  const now = Date.now()
  const umbrellaPositions = umbrella.map((position) => ({
    ...position,
    suppliedUsd: Number(position.suppliedUsd6 ?? "0") / 1_000_000,
    cooldownUsd: Number(position.cooldownAmountUsd6 ?? "0") / 1_000_000,
    lifecycleStatus: deriveAskAIUmbrellaStatus({ ...position, now }),
    remainingCooldownMs: Math.max(0, (position.cooldownEndsAt ?? 0) - now),
    remainingWithdrawalWindowMs: Math.max(0, (position.withdrawalWindowEndsAt ?? 0) - now),
  }))
  const umbrellaCooldowns = umbrellaTranches.flatMap((tranche) => {
    const amountUsd = Number(tranche.amountUsd6) / 1_000_000
    if (tranche.status === "consumed" || amountUsd <= 0) return []
    const status = now < tranche.endsAt ? "cooling" : now <= tranche.windowEndsAt ? "ready" : "expired"
    return [
      {
        positionId: tranche.positionId,
        marketId: tranche.marketId,
        amountUsd,
        status,
        startedAt: tranche.startedAt,
        endsAt: tranche.endsAt,
        windowEndsAt: tranche.windowEndsAt,
        remainingCooldownMs: status === "cooling" ? tranche.endsAt - now : 0,
        remainingWithdrawalWindowMs: status === "ready" ? tranche.windowEndsAt - now : 0,
        canWithdraw: status === "ready",
      },
    ]
  })
  const cooling = umbrellaCooldowns.filter((tranche) => tranche.status === "cooling")
  const ready = umbrellaCooldowns.filter((tranche) => tranche.status === "ready")
  const expired = umbrellaCooldowns.filter((tranche) => tranche.status === "expired")
  const umbrellaSuppliedUsd = umbrella.reduce(
    (sum, position) => sum + Number(position.suppliedUsd6 ?? "0") / 1_000_000,
    0,
  )

  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    wallet,
    totals: {
      lendUsd: sumUsd(lend),
      borrowUsd: sumUsd(borrow),
      multiplyUsd: sumUsd(multiply),
      liquidUsd: sumUsd(liquid),
      umbrellaUsd: umbrellaSuppliedUsd,
    },
    lend,
    borrow,
    multiply,
    liquid,
    umbrella: umbrellaPositions,
    umbrellaCooldowns,
    umbrellaCooldownSummary: {
      coolingCount: cooling.length,
      coolingUsd: cooling.reduce((sum, tranche) => sum + tranche.amountUsd, 0),
      readyCount: ready.length,
      readyUsd: ready.reduce((sum, tranche) => sum + tranche.amountUsd, 0),
      expiredCount: expired.length,
      expiredUsd: expired.reduce((sum, tranche) => sum + tranche.amountUsd, 0),
      nextCooldownEndsAt: cooling.length > 0 ? Math.min(...cooling.map((tranche) => tranche.endsAt)) : null,
      nextWithdrawalWindowEndsAt: ready.length > 0 ? Math.min(...ready.map((tranche) => tranche.windowEndsAt)) : null,
    },
    asOf: Math.max(
      0,
      ...lend.map((row) => row.updatedAt),
      ...borrow.map((row) => row.updatedAt),
      ...multiply.map((row) => row.updatedAt),
      ...liquid.map((row) => row.updatedAt),
      ...umbrella.map((row) => row.lastUpdatedAt),
      ...umbrellaTranches.map((row) => row.updatedAt),
    ),
  }
}

export const portfolio = query({
  args: {},
  handler: readAskAIPortfolio,
})

export const portfolioForTurn = internalQuery({
  args: { turnId: v.id("askAITurns") },
  handler: async (ctx, { turnId }) => readAskAIPortfolio(withTurnWallet(ctx, await readRunningTurnWallet(ctx, turnId))),
})

export async function readAskAIEngineSnapshot(
  ctx: PortfolioReadCtx,
  { multiplyShockPct, lendProjectionDays }: { multiplyShockPct?: number; lendProjectionDays?: number },
) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }

  const [positions, borrowRisk, multiplyParameters] = await Promise.all([
    ctx.db
      .query("positions")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("riskSnapshots")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .order("desc")
      .first(),
    ctx.db.query("multiplyTokenParameters").collect(),
  ])

  const parameterBySymbol = new Map(multiplyParameters.map((row) => [row.symbol.toLowerCase(), row]))
  const now = Date.now()
  const lendDays = Math.min(Math.max(lendProjectionDays ?? 30, 1), 365)
  const shockPct = Math.min(Math.max(multiplyShockPct ?? -20, -95), 100)

  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    wallet,
    borrow: borrowRisk
      ? {
          engine: "credit-engine" as const,
          at: borrowRisk.at,
          ...decodeBorrowRiskSnapshot(borrowRisk),
          spokes: borrowRisk.spokes.map((spoke) => ({
            spokeId: spoke.spokeId,
            availableCreditUsd: Number(spoke.availableCreditUsd6) / 1_000_000,
            totalBorrowedUsd: Number(spoke.totalBorrowedUsd6) / 1_000_000,
            liquidationBufferUsd: Number(spoke.liquidationBufferUsd6) / 1_000_000,
            healthFactor:
              spoke.healthFactorWad === null ? null : Number(spoke.healthFactorWad) / 1_000_000_000_000_000_000,
          })),
        }
      : null,
    lend: positions
      .filter((position) => position.product === "lend" && position.status === "open")
      .map((position) => {
        const principalUsd = Number(position.suppliedUsd6 ?? "0") / 1_000_000
        return {
          engine: "lend-engine" as const,
          marketSlug: position.marketSlug,
          principalUsd,
          earnedUsd: Number(position.earnedUsd6 ?? "0") / 1_000_000,
          projection: calculateLendProjection({
            principalUsd,
            supplyApyPct: position.supplyApyPct ?? 0,
            days: lendDays,
          }),
        }
      }),
    multiply: positions
      .filter((position) => position.product === "multiply" && position.status === "open")
      .map((position) => {
        const parameters = parameterBySymbol.get((position.assetId ?? "").toLowerCase())
        return {
          engine: "multiply-engine" as const,
          marketSlug: position.marketSlug,
          collateralValueUsd: position.collateralValueUsd ?? 0,
          debtValueUsd: position.debtValueUsd ?? 0,
          persistedHealthFactor: position.healthFactor ?? null,
          stress: parameters
            ? calculateMultiplyStress({
                collateralValueUsd: position.collateralValueUsd ?? 0,
                debtValueUsd: position.debtValueUsd ?? 0,
                liquidationThresholdPct: parameters.liquidationThresholdPct,
                collateralPriceShockPct: shockPct,
              })
            : null,
          stressUnavailableReason: parameters ? null : "Missing multiply token risk parameters",
        }
      }),
    umbrella: positions
      .filter((position) => position.product === "umbrella")
      .map((position) => ({
        engine: "umbrella-system" as const,
        marketSlug: position.marketSlug,
        suppliedUsd: Number(position.suppliedUsd6 ?? "0") / 1_000_000,
        earnedUsd: Number(position.earnedUsd6 ?? "0") / 1_000_000,
        cooldownUsd: Number(position.cooldownAmountUsd6 ?? "0") / 1_000_000,
        slashedUsd: Number(position.slashedAmountUsd6 ?? "0") / 1_000_000,
        status: deriveAskAIUmbrellaStatus({ ...position, now }),
      })),
    asOf: Math.max(0, borrowRisk?.at ?? 0, ...positions.map((position) => position.lastUpdatedAt)),
  }
}

export const engineSnapshot = query({
  args: { multiplyShockPct: v.optional(v.number()), lendProjectionDays: v.optional(v.number()) },
  handler: readAskAIEngineSnapshot,
})

export async function readAskAIBorrowCapacity(ctx: PortfolioReadCtx) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
  const [snapshot, portfolio] = await Promise.all([
    ctx.db
      .query("riskSnapshots")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .order("desc")
      .first(),
    ctx.db
      .query("portfolioCurrent")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .unique(),
  ])
  const capacity = snapshot
    ? { ...decodeBorrowRiskSnapshot(snapshot), source: "credit_engine_snapshot" as const }
    : portfolio
      ? {
          borrowCapacityUsd: portfolio.availableToBorrowUsd + portfolio.totalBorrowedUsd,
          availableBorrowCapacityUsd: portfolio.availableToBorrowUsd,
          totalBorrowedUsd: portfolio.totalBorrowedUsd,
          source: "portfolio_current" as const,
        }
      : null
  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    wallet,
    capacity,
    spokes: snapshot?.spokes ?? [],
    asOf: snapshot?.at ?? portfolio?.at ?? 0,
  }
}

export const borrowCapacity = query({ args: {}, handler: readAskAIBorrowCapacity })

export const borrowCapacityForTurn = internalQuery({
  args: { turnId: v.id("askAITurns") },
  handler: async (ctx, { turnId }) =>
    readAskAIBorrowCapacity(withTurnWallet(ctx, await readRunningTurnWallet(ctx, turnId))),
})

export async function readAskAIPositionRisk(ctx: PortfolioReadCtx, positionId?: string) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
  const positions = await ctx.db
    .query("positions")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .collect()
  const selected = positionId ? positions.find((position) => position._id === positionId) : undefined
  if (positionId && !selected) throw new Error("Position not found")
  const relevant = selected ? [selected] : positions.filter((position) => position.status === "open")
  const engine = await readAskAIEngineSnapshot(ctx, { multiplyShockPct: -20 })
  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    wallet,
    positions: relevant,
    engine,
    asOf: engine.asOf,
  }
}

export const positionRisk = query({
  args: { positionId: v.optional(v.string()) },
  handler: async (ctx, { positionId }) => readAskAIPositionRisk(ctx, positionId),
})

export const positionRiskForTurn = internalQuery({
  args: { turnId: v.id("askAITurns"), positionId: v.optional(v.string()) },
  handler: async (ctx, { turnId, positionId }) =>
    readAskAIPositionRisk(withTurnWallet(ctx, await readRunningTurnWallet(ctx, turnId)), positionId),
})

const simulateBorrowArgs = {
  positionId: v.string(),
  additionalBorrowAmount: v.number(),
  borrowAsset: v.string(),
}

async function readAskAISimulateBorrow(
  ctx: PortfolioReadCtx,
  {
    positionId,
    additionalBorrowAmount,
    borrowAsset,
  }: {
    positionId: string
    additionalBorrowAmount: number
    borrowAsset: string
  },
) {
  if (!Number.isFinite(additionalBorrowAmount) || additionalBorrowAmount <= 0 || additionalBorrowAmount > 1_000_000_000)
    throw new Error("Additional borrow amount is invalid")
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
  const positions = await ctx.db
    .query("positions")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .collect()
  const position = positions.find((row) => row._id === positionId && row.status === "open")
  if (!position) throw new Error("Position not found")
  const market = await ctx.db
    .query("borrowMarkets")
    .withIndex("by_slug", (q) => q.eq("slug", position.marketSlug))
    .unique()
  if (!market?.maxLtvPct) throw new Error("Position risk parameters are unavailable")
  const collateralValueUsd = position.collateralValueUsd ?? Number(position.collateralValueUsd6 ?? "0") / 1_000_000
  const debtValueUsd = position.debtValueUsd ?? Number(position.debtValueUsd6 ?? "0") / 1_000_000
  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    positionId,
    borrowAsset: borrowAsset.trim().toUpperCase(),
    additionalBorrowAmount,
    simulation: calculateAskAIBorrowSimulation({
      collateralValueUsd,
      debtValueUsd,
      additionalBorrowAmountUsd: additionalBorrowAmount,
      maxLtvPct: market.maxLtvPct,
    }),
    asOf: position.lastUpdatedAt,
  }
}

export const simulateBorrow = query({
  args: simulateBorrowArgs,
  handler: readAskAISimulateBorrow,
})

export const simulateBorrowForTurn = internalQuery({
  args: { turnId: v.id("askAITurns"), ...simulateBorrowArgs },
  handler: async (ctx, { turnId, ...args }) =>
    readAskAISimulateBorrow(withTurnWallet(ctx, await readRunningTurnWallet(ctx, turnId)), args),
})

const stressPositionArgs = {
  positionId: v.string(),
  assetPriceChanges: v.array(v.object({ symbol: v.string(), change: v.number() })),
}

async function readAskAIStressPosition(
  ctx: PortfolioReadCtx,
  {
    positionId,
    assetPriceChanges,
  }: { positionId: string; assetPriceChanges: Array<{ symbol: string; change: number }> },
) {
  if (assetPriceChanges.length < 1 || assetPriceChanges.length > 8)
    throw new Error("Provide 1 to 8 asset price changes")
  for (const item of assetPriceChanges)
    if (!Number.isFinite(item.change) || item.change < -0.95 || item.change > 1)
      throw new Error("Asset price change must be between -0.95 and 1")
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
  const positions = await ctx.db
    .query("positions")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .collect()
  const position = positions.find((row) => row._id === positionId && row.status === "open")
  if (!position) throw new Error("Position not found")
  const market = await ctx.db
    .query("markets")
    .withIndex("by_slug", (q) => q.eq("slug", position.marketSlug))
    .first()
  const parameter = position.assetId
    ? await ctx.db
        .query("multiplyTokenParameters")
        .withIndex("by_symbol", (q) => q.eq("symbol", position.assetId!))
        .unique()
    : null
  const constituents = market?.constituents ?? (position.assetId ? [{ symbol: position.assetId, weight: 1 }] : [])
  const liquidationThresholdPct = parameter?.liquidationThresholdPct
  if (constituents.length === 0 || liquidationThresholdPct === undefined)
    throw new Error("Position risk parameters are unavailable")
  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    positionId,
    simulation: calculateAskAICollateralStress({
      collateralValueUsd: position.collateralValueUsd ?? Number(position.collateralValueUsd6 ?? "0") / 1_000_000,
      debtValueUsd: position.debtValueUsd ?? Number(position.debtValueUsd6 ?? "0") / 1_000_000,
      liquidationThresholdPct,
      constituents,
      assetPriceChanges: Object.fromEntries(
        assetPriceChanges.map(({ symbol, change }) => [symbol.toUpperCase(), change]),
      ),
    }),
    asOf: position.lastUpdatedAt,
  }
}

export const stressPosition = query({
  args: stressPositionArgs,
  handler: readAskAIStressPosition,
})

export const stressPositionForTurn = internalQuery({
  args: { turnId: v.id("askAITurns"), ...stressPositionArgs },
  handler: async (ctx, { turnId, ...args }) =>
    readAskAIStressPosition(withTurnWallet(ctx, await readRunningTurnWallet(ctx, turnId)), args),
})

export async function readAskAIMarketSnapshots(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  {
    sources,
    kind,
    limit,
  }: {
    sources?: AskAIMarketSource[]
    kind?: "token_price" | "dex_pool" | "lending_market"
    limit?: number
  },
) {
  const boundedLimit = Math.min(Math.max(limit ?? 10, 1), 50)
  const rows = sources
    ? (
        await Promise.all(
          sources.map((source) =>
            kind
              ? ctx.db
                  .query("askAIMarketSnapshots")
                  .withIndex("by_source_kind_key", (q) => q.eq("source", source).eq("kind", kind))
                  .take(boundedLimit)
              : ctx.db
                  .query("askAIMarketSnapshots")
                  .withIndex("by_source_kind_key", (q) => q.eq("source", source))
                  .take(boundedLimit),
          ),
        )
      ).flat()
    : await ctx.db.query("askAIMarketSnapshots").withIndex("by_fetched_at").order("desc").take(boundedLimit)
  return rows
    .filter((row) => !kind || row.kind === kind)
    .filter((row) => marketFreshness(row.kind, row.sourceUpdatedAt ?? row.fetchedAt, Date.now()) === "fresh")
    .sort((left, right) => right.fetchedAt - left.fetchedAt)
    .slice(0, boundedLimit)
}

export const marketSnapshots = query({
  args: {
    sources: v.optional(
      v.array(
        v.union(
          v.literal("coingecko"),
          v.literal("defillama"),
          v.literal("uniswap"),
          v.literal("curve"),
          v.literal("balancer"),
          v.literal("aave"),
        ),
      ),
    ),
    kind: v.optional(v.union(v.literal("token_price"), v.literal("dex_pool"), v.literal("lending_market"))),
    limit: v.optional(v.number()),
  },
  handler: readAskAIMarketSnapshots,
})

export function marketFreshness(kind: "token_price" | "dex_pool" | "lending_market", at: number, now = Date.now()) {
  const threshold =
    kind === "dex_pool"
      ? ASK_AI_CONFIG.freshness.poolMetricsStaleAfterMs
      : kind === "lending_market"
        ? ASK_AI_CONFIG.freshness.aaveMarketStaleAfterMs
        : ASK_AI_CONFIG.freshness.tokenPriceStaleAfterMs
  return now - at <= threshold ? ("fresh" as const) : ("stale" as const)
}

// Filler words that would otherwise match everything (e.g. "on" is a substring
// of many payloads) and drown out the meaningful terms in a natural question.
const ASK_AI_SEARCH_STOPWORDS = new Set([
  "the",
  "is",
  "are",
  "was",
  "on",
  "in",
  "of",
  "to",
  "for",
  "and",
  "or",
  "a",
  "an",
  "what",
  "whats",
  "which",
  "best",
  "top",
  "highest",
  "biggest",
  "largest",
  "good",
  "great",
  "show",
  "me",
  "my",
  "our",
  "i",
  "do",
  "does",
  "how",
  "now",
  "current",
  "currently",
  "price",
  "prices",
  "rate",
  "rates",
  "market",
  "markets",
  "pool",
  "pools",
  "token",
  "tokens",
  "asset",
  "assets",
])

const ASK_AI_SEARCH_TERM_ALIASES = new Map([
  ["bitcoin", "btc"],
  ["ethereum", "eth"],
  ["chainlink", "link"],
  ["uniswap", "uni"],
  ["arbitrum", "arb"],
  ["optimism", "op"],
  ["aerodrome", "aero"],
  ["curve", "crv"],
  ["tether", "usdt"],
])

const ASK_AI_PRICE_SYMBOLS = new Set([
  "aave",
  "aero",
  "arb",
  "bal",
  "btc",
  "cbbtc",
  "cbeth",
  "crv",
  "crvusd",
  "dai",
  "eth",
  "eurc",
  "frxusd",
  "gho",
  "gno",
  "ldo",
  "link",
  "op",
  "reth",
  "rlusd",
  "steth",
  "uni",
  "usdc",
  "usde",
  "usdg",
  "usdt",
  "wbtc",
  "weeth",
  "weth",
  "wsteth",
])

const ASK_AI_PRICE_TERM_SYMBOLS = new Map<string, string[]>([
  ["btc", ["btc", "wbtc", "cbbtc"]],
  ["eth", ["eth", "weth", "steth", "wsteth", "reth", "weeth", "cbeth"]],
])

// The provider payloads store the human-searchable names (project, symbol,
// chain) — the snapshot `key` is often an opaque hash (e.g. "defillama:0x…"),
// so matching on key+source alone never finds a Uniswap/ETH pool by name.
function askAISnapshotHaystack(snapshot: { source: string; kind: string; key: string; payload: unknown }): string {
  const payload = (snapshot.payload ?? {}) as Record<string, unknown>
  const fields = [
    snapshot.source,
    snapshot.kind,
    snapshot.key,
    payload.symbol,
    payload.project,
    payload.chain,
    payload.market,
    payload.name,
    payload.id,
  ]
  return fields
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase()
}

// Rank magnitude so "best/top/largest" surfaces the deepest markets first.
function askAISnapshotSize(payload: unknown): number {
  const row = (payload ?? {}) as Record<string, unknown>
  const candidate = row.tvlUsd ?? row.totalValueLockedUSD ?? row.sizeUsd ?? row.availableLiquidity
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0
}

function finiteMarketNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function compactMarketData(kind: "token_price" | "dex_pool" | "lending_market", payload: unknown) {
  const row = (payload ?? {}) as Record<string, unknown>
  const fields: Record<string, unknown> =
    kind === "token_price"
      ? {
          symbol: row.symbol,
          priceUsd: finiteMarketNumber(row.price) ?? finiteMarketNumber(row.priceUsd) ?? finiteMarketNumber(row.usd),
          confidence: finiteMarketNumber(row.confidence),
          status: row.status,
        }
      : kind === "dex_pool"
        ? {
            pool: row.pool ?? row.id,
            project: row.project,
            chain: row.chain,
            symbol: row.symbol,
            tvlUsd:
              finiteMarketNumber(row.tvlUsd) ??
              finiteMarketNumber(row.totalValueLockedUSD) ??
              finiteMarketNumber(row.liquidityUsd),
            volume24hUsd: finiteMarketNumber(row.volume24hUsd) ?? finiteMarketNumber(row.volume24h),
            apyPct: finiteMarketNumber(row.apy),
          }
        : {
            market: row.market,
            symbol: row.symbol,
            name: row.name,
            sizeUsd: finiteMarketNumber(row.sizeUsd),
            supplyApyPct: finiteMarketNumber(row.supplyApyPct),
            borrowApyPct: finiteMarketNumber(row.variableBorrowRate),
            utilizationPct: finiteMarketNumber(row.utilizationRate),
            availableLiquidityUsd: finiteMarketNumber(row.availableLiquidity),
          }
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
}

export const searchMarkets = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { query: rawQuery, limit }) => {
    const queryText = rawQuery.trim().toLowerCase()
    if (!queryText || queryText.length > 200) throw new Error("Market query must contain 1 to 200 characters")
    const boundedLimit = Math.min(Math.max(limit ?? 10, 1), 20)
    const terms = queryText.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
    // Drop filler words so a natural question ("best ETH pools on Uniswap")
    // matches on "eth"/"uniswap", not on "on"/"best". Fall back to raw terms if
    // the query was entirely stopwords.
    const meaningfulTerms = terms.filter((term) => term.length >= 3 && !ASK_AI_SEARCH_STOPWORDS.has(term))
    const searchTerms = (meaningfulTerms.length > 0 ? meaningfulTerms : terms).map(
      (term) => ASK_AI_SEARCH_TERM_ALIASES.get(term) ?? term,
    )
    // Nudge the ranking toward what the question is about, so a "pools" question
    // surfaces pools and a "price" question surfaces token prices even when both
    // match the same asset term.
    const wantsPools = /\b(pool|pools|liquidity|tvl|lp)\b/.test(queryText)
    const wantsYield = /\b(yield|yields|apr|apy|rate|rates|lend|lending|supply|borrow)\b/.test(queryText)
    const wantsPrice = /\b(price|prices|worth|cost|value|quote)\b/.test(queryText)
    const wantsAaveProtocol =
      /\b(?:on|from|at)\s+aave\b/.test(queryText) ||
      /\baave(?:\s+v3)?\s+(?:lend|lending|market|markets|pool|pools|apy|apr|rate|rates)\b/.test(queryText)
    const minimumYieldMatch = queryText.match(
      /\b(?:at least|above|over|more than|minimum(?: of)?)\s+(\d+(?:\.\d+)?)\s*%/,
    )
    const minimumYieldPct = minimumYieldMatch ? Number(minimumYieldMatch[1]) : null
    const kindBoost = (kind: "token_price" | "dex_pool" | "lending_market") =>
      (wantsPools && kind === "dex_pool" ? 2 : wantsPools && kind === "lending_market" ? 1 : 0) +
      (wantsYield && kind === "lending_market" ? 2 : wantsYield && kind === "dex_pool" ? 1 : 0) +
      (wantsPrice && kind === "token_price" ? 1 : 0)

    // Exact price questions are the highest-volume Ask AI read. Resolve only the
    // symbols named in the prompt through indexes instead of collecting every
    // price and every historical point on every request. This keeps one lookup
    // O(symbols requested) even when the cache grows and many users ask at once.
    const requestedSymbols = [
      ...new Set(
        searchTerms
          .filter((term) => ASK_AI_PRICE_SYMBOLS.has(term))
          .flatMap((term) => ASK_AI_PRICE_TERM_SYMBOLS.get(term) ?? [term])
          .slice(0, boundedLimit),
      ),
    ]
    const tokenPrices = (
      await Promise.all(
        requestedSymbols.map((symbol) =>
          ctx.db
            .query("tokenPrices")
            .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
            .unique(),
        ),
      )
    ).filter((price): price is NonNullable<typeof price> => Boolean(price))
    const historyRows = await Promise.all(
      tokenPrices.map(async (price) => ({
        symbol: price.symbol,
        rows: await ctx.db
          .query("tokenPricesHistory")
          .withIndex("by_symbol_day", (q) => q.eq("symbol", price.symbol))
          .order("desc")
          .take(90),
      })),
    )
    const historyBySymbol = new Map(
      historyRows.map(({ symbol, rows }) => [
        symbol,
        rows.map((point) => ({ day: point.day, priceUsd: point.priceUsd })).sort((a, b) => a.day.localeCompare(b.day)),
      ]),
    )

    const scoredPrices = tokenPrices
      .filter((price) => price.status !== "invalid")
      .map((price) => {
        const haystack = price.symbol.toLowerCase()
        const matched = searchTerms.filter((term) => haystack.includes(term)).length
        return {
          matched,
          exact: searchTerms.includes(haystack) ? 1 : 0,
          boost: kindBoost("token_price"),
          size: 0,
          row: {
            source: "defillama" as const,
            kind: "token_price" as const,
            key: price.symbol,
            data: compactMarketData("token_price", {
              symbol: price.symbol,
              priceUsd: price.priceUsd,
              confidence: price.confidence,
              status: price.status,
            }),
            history: historyBySymbol.get(price.symbol) ?? [],
            asOf: price.sourceUpdatedAt ?? price.updatedAt,
            freshness: price.status === "fresh" ? ("fresh" as const) : ("stale" as const),
          },
        }
      })
      .filter((entry) => entry.matched > 0)

    if (wantsPrice && scoredPrices.length > 0) {
      return {
        markets: [],
        providerData: scoredPrices
          .sort((a, b) => b.matched - a.matched || b.exact - a.exact)
          .slice(0, boundedLimit)
          .map((entry) => entry.row),
      }
    }

    const [marketCache, snapshots] = await Promise.all([
      ctx.db
        .query("marketSnapshotsCache")
        .withIndex("by_singleton", (q) => q.eq("singleton", "markets"))
        .first(),
      wantsPools && !wantsYield
        ? ctx.db
            .query("askAIMarketSnapshots")
            .withIndex("by_source_kind_key", (q) => q.eq("source", "defillama").eq("kind", "dex_pool"))
            .take(250)
        : ctx.db.query("askAIMarketSnapshots").withIndex("by_fetched_at").order("desc").take(250),
    ])
    // Tests and a brand-new deployment can briefly precede the scheduled cache
    // build. Keep a bounded cold fallback, while production reads one singleton.
    const markets = marketCache?.rows ?? (await ctx.db.query("markets").take(200))
    const matchingMarkets = (wantsAaveProtocol ? [] : markets)
      .filter((market) => {
        const haystack = `${market.slug} ${market.name} ${market.symbol} ${market.venueLabel ?? ""}`.toLowerCase()
        return searchTerms.some((term) => haystack.includes(term))
      })
      .slice(0, boundedLimit)

    // Score canonical prices and cached snapshots on the SAME scale, then rank the
    // combined list — otherwise token prices (added first) crowd out deep pools.
    const scoredSnapshots = snapshots
      .filter((snapshot) => marketFreshness(snapshot.kind, snapshot.sourceUpdatedAt ?? snapshot.fetchedAt) === "fresh")
      .map((snapshot) => {
        const haystack = askAISnapshotHaystack(snapshot)
        const matched = searchTerms.filter((term) => haystack.includes(term)).length
        const data = compactMarketData(snapshot.kind, snapshot.payload)
        const symbol = typeof data.symbol === "string" ? data.symbol.toLowerCase() : ""
        return {
          matched,
          exact: symbol.length > 0 && searchTerms.includes(symbol) ? 1 : 0,
          boost: kindBoost(snapshot.kind),
          size: askAISnapshotSize(snapshot.payload),
          row: {
            source: snapshot.source,
            kind: snapshot.kind,
            key: snapshot.key,
            data,
            asOf: snapshot.sourceUpdatedAt ?? snapshot.fetchedAt,
            freshness: marketFreshness(snapshot.kind, snapshot.sourceUpdatedAt ?? snapshot.fetchedAt),
          },
          yieldPct:
            typeof data.supplyApyPct === "number"
              ? data.supplyApyPct
              : typeof data.apyPct === "number"
                ? data.apyPct
                : Number.NEGATIVE_INFINITY,
        }
      })
      .filter(
        (entry) =>
          entry.matched > 0 &&
          (!wantsAaveProtocol || entry.row.source === "aave") &&
          (!wantsYield || entry.row.kind === "lending_market" || entry.row.kind === "dex_pool"),
      )

    const providerData = [...scoredPrices, ...scoredSnapshots]
      // Most query terms matched, then the kind the question asked for, then depth.
      .sort((a, b) => {
        if (minimumYieldPct !== null && "yieldPct" in a && "yieldPct" in b) {
          const aMeets = a.yieldPct >= minimumYieldPct
          const bMeets = b.yieldPct >= minimumYieldPct
          if (aMeets !== bMeets) return aMeets ? -1 : 1
          if (a.yieldPct !== b.yieldPct) return b.yieldPct - a.yieldPct
        }
        return b.matched - a.matched || b.boost - a.boost || b.exact - a.exact || b.size - a.size
      })
      .slice(0, boundedLimit)
      .map((entry) => entry.row)

    return { markets: matchingMarkets, providerData }
  },
})

export const poolMetrics = query({
  args: { marketId: v.string() },
  handler: async (ctx, { marketId }) => {
    const normalizedId = marketId.trim().toLowerCase()
    if (!normalizedId || normalizedId.length > 160) throw new Error("Market ID is invalid")
    const snapshots = await ctx.db.query("askAIMarketSnapshots").withIndex("by_fetched_at").order("desc").take(100)
    // Slug is a lowercase URL-safe id, so the common lookup is a point read.
    // Fall back to a symbol point read (symbols are typically upper-case).
    const market =
      (await ctx.db
        .query("markets")
        .withIndex("by_slug", (q) => q.eq("slug", normalizedId))
        .first()) ??
      (await ctx.db
        .query("markets")
        .withIndex("by_symbol", (q) => q.eq("symbol", normalizedId.toUpperCase()))
        .first())
    const aliases = new Set([normalizedId, market?.slug.toLowerCase(), market?.symbol.toLowerCase()].filter(Boolean))
    const providerData = snapshots
      .filter((snapshot) => snapshot.kind === "dex_pool" && aliases.has(snapshot.key.toLowerCase()))
      .filter((snapshot) => marketFreshness("dex_pool", snapshot.sourceUpdatedAt ?? snapshot.fetchedAt) === "fresh")
      .map((snapshot) => ({
        source: snapshot.source,
        data: snapshot.payload,
        asOf: snapshot.sourceUpdatedAt ?? snapshot.fetchedAt,
        freshness: marketFreshness("dex_pool", snapshot.sourceUpdatedAt ?? snapshot.fetchedAt),
      }))
    if (!market && providerData.length === 0) throw new Error("Market not found")
    return { market: market ?? null, providerData }
  },
})
