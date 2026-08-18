import type { PortfolioLendTabData, PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"
import type { DebtRowContext, SupplyRowContext } from "@/app/lib/data/borrow-position-types"
import { BORROW_POOL_CATALOG } from "@/app/lib/borrow-sim"
import { normalizeWeights, type WeightedConstituent } from "@/app/lib/prices/lp-token-price"

/**
 * Which product surface this exposure came from. Kept fine-grained so the UI
 * can attribute a symbol's balance back to each product (long vs short).
 */
export type ExposureSourceKind =
  "lend" | "borrow-collateral" | "borrow-debt" | "multiply-collateral" | "multiply-debt" | "umbrella"

export type ExposureLeg = {
  source: ExposureSourceKind
  /** Non-negative — sign is derived from `direction`. */
  usd: number
  direction: "long" | "short"
  /** Human hint for the row (e.g. pool label, market label). */
  detail?: string
}

export type SymbolExposure = {
  symbol: string
  longUsd: number
  shortUsd: number
  netUsd: number
  legs: ExposureLeg[]
}

export type UmbrellaExposureRow = {
  symbol: string
  valueUsd: number
  pendingRewardsUsd: number
}

/** Uppercase-trim a token symbol so "usdc" and " USDC" bucket together. */
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

function upsertLeg(map: Map<string, SymbolExposure>, symbol: string, leg: ExposureLeg): void {
  if (!symbol || leg.usd <= 0) return
  const normalized = normalizeSymbol(symbol)
  if (!normalized) return
  const existing = map.get(normalized)
  const bucket = existing ?? { symbol: normalized, longUsd: 0, shortUsd: 0, netUsd: 0, legs: [] }
  if (leg.direction === "long") bucket.longUsd += leg.usd
  else bucket.shortUsd += leg.usd
  bucket.netUsd = bucket.longUsd - bucket.shortUsd
  bucket.legs.push(leg)
  map.set(normalized, bucket)
}

/**
 * Resolve an LP pool's constituents + normalized weights so its collateral USD can be attributed
 * per underlying asset. Uses the pool's real composition from the catalog (by id, then name) —
 * covering 80/20 and 3+/4-token pools correctly — and falls back to an equal-weight split over the
 * two display visuals for pools the catalog doesn't cover (e.g. hydrated markets not in it).
 */
function resolvePoolConstituents(pool: SupplyRowContext["pool"]): WeightedConstituent[] {
  const catalogPool =
    BORROW_POOL_CATALOG.find((p) => p.id === pool.id) ?? BORROW_POOL_CATALOG.find((p) => p.name === pool.name)
  if (catalogPool && catalogPool.constituents.length > 0) return catalogPool.constituents
  return normalizeWeights([
    { symbol: pool.visuals[0].symbol, weight: 1 },
    { symbol: pool.visuals[1].symbol, weight: 1 },
  ])
}

function aggregateLend(map: Map<string, SymbolExposure>, lend: PortfolioLendTabData | undefined | null): void {
  if (!lend) return
  for (const inv of lend.investments) {
    upsertLeg(map, inv.symbol, {
      source: "lend",
      usd: inv.suppliedUsd,
      direction: "long",
      detail: inv.name ?? inv.symbol,
    })
  }
}

function aggregateBorrow(
  map: Map<string, SymbolExposure>,
  collateralRows: readonly SupplyRowContext[] | undefined,
  debtRows: readonly DebtRowContext[] | undefined,
): void {
  if (collateralRows) {
    for (const row of collateralRows) {
      const collateralUsd = Math.max(0, row.pool.collateralUsd)
      // Attribute the LP collateral USD across ALL constituents by their real weights (80/20,
      // tri-stable, …), not a flat 50/50 over the two display legs.
      for (const constituent of resolvePoolConstituents(row.pool)) {
        upsertLeg(map, constituent.symbol, {
          source: "borrow-collateral",
          usd: collateralUsd * constituent.weight,
          direction: "long",
          detail: row.pool.name,
        })
      }
    }
  }
  if (debtRows) {
    for (const row of debtRows) {
      upsertLeg(map, row.debtAssetSymbol, {
        source: "borrow-debt",
        usd: Math.max(0, row.borrowedUsd),
        direction: "short",
        detail: row.pool.name,
      })
    }
  }
}

function aggregateMultiply(
  map: Map<string, SymbolExposure>,
  multiply: PortfolioMultiplyTabData | undefined | null,
): void {
  if (!multiply) return
  for (const row of multiply.lpCollaterals) {
    if (row.status !== "open") continue
    upsertLeg(map, row.collateralToken, {
      source: "multiply-collateral",
      usd: Math.max(0, row.collateralUsd),
      direction: "long",
      detail: row.label,
    })
    upsertLeg(map, row.borrowableToken, {
      source: "multiply-debt",
      usd: Math.max(0, row.debtUsd),
      direction: "short",
      detail: row.label,
    })
  }
}

function aggregateUmbrella(
  map: Map<string, SymbolExposure>,
  umbrella: readonly UmbrellaExposureRow[] | undefined,
): void {
  if (!umbrella) return
  for (const row of umbrella) {
    const total = Math.max(0, row.valueUsd) + Math.max(0, row.pendingRewardsUsd)
    upsertLeg(map, row.symbol, {
      source: "umbrella",
      usd: total,
      direction: "long",
      detail: `Umbrella ${normalizeSymbol(row.symbol)}`,
    })
  }
}

export type ExposureInputs = {
  lend?: PortfolioLendTabData | null
  borrowCollateral?: readonly SupplyRowContext[]
  borrowDebt?: readonly DebtRowContext[]
  multiply?: PortfolioMultiplyTabData | null
  umbrella?: readonly UmbrellaExposureRow[]
}

/**
 * Roll up long/short USD exposure per token symbol across every product. LP
 * pairs on the borrow side are split 50/50 across their two legs so a
 * USDC/WETH pool contributes to BOTH the USDC and the WETH buckets. Multiply
 * positions contribute their collateral asset (long) and borrow asset (short)
 * — the sandbox treats each asset as a distinct token, not an LP.
 *
 * Returned entries are sorted by absolute exposure (long + short) descending
 * so the loudest symbols surface first.
 */
export function aggregateSymbolExposure(inputs: ExposureInputs): SymbolExposure[] {
  const map = new Map<string, SymbolExposure>()
  aggregateLend(map, inputs.lend)
  aggregateBorrow(map, inputs.borrowCollateral, inputs.borrowDebt)
  aggregateMultiply(map, inputs.multiply)
  aggregateUmbrella(map, inputs.umbrella)
  return [...map.values()]
    .filter((entry) => entry.longUsd > 0 || entry.shortUsd > 0)
    .sort((a, b) => b.longUsd + b.shortUsd - (a.longUsd + a.shortUsd))
}
