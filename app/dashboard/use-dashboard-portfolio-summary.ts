"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { getSwapAsset } from "@/app/lib/swap-system/catalog"
import type { UserAssetBalance } from "@/app/lib/swap-system"
import { buildDashboardWalletBalanceRows, selectDashboardWalletValueRows } from "@/app/lib/swap-system"
import { useConvexProductWalletBalances } from "@/app/lib/swap-system/use-convex-wallet-balances"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"
import {
  useBorrowSessionContext,
  useLendSessionContext,
  useMultiplySessionContext,
} from "@/app/lib/avana-session/avana-sessions-provider"
import { useHasMounted } from "@/app/lib/ui/use-has-mounted"
import { buildPortfolioMultiplyData } from "@/app/lib/multiply-system/read-model"
import { buildPortfolioLendData } from "@/app/lib/lend-system/read-model"
import {
  buildBorrowBalanceMetrics,
  buildLendDashboardMetrics,
  buildMultiplyBalanceMetrics,
} from "@/app/dashboard/dashboard-tab-metrics"
import { sumWalletValueUsd } from "@/app/dashboard/dashboard-wallet-tab"
import { blendEquityWeightedNetApyPct, resolveDashboardNetApyPct } from "@/app/dashboard/portfolio-headline-metrics"

export type DashboardPortfolioSummary = {
  /** Net Portfolio Value (Assets − Debt), aggregated across products. Umbrella excluded. */
  netValueUsd: number
  /** Value-weighted blended Net APY. Umbrella excluded. */
  netApyPct: number
  /** Wallet-accessible funds, including returned available product balances (same scope as the Wallet tab). */
  walletBalanceUsd: number
}

/**
 * Global Net Value = the signed sum of the wallet's canonical product balances
 * (walletLiquid + lend + borrow + multiply buckets), with debt rows negative.
 * Non-LP tokens are valued off the live oracle (`priceFor`); LP rows carry the
 * live-repriced basis productBalances now returns (convex/wallet/productBalances.ts
 * reprices collateral LP at the pool's live price). Umbrella is NEVER part of
 * productBalances, so it is excluded by construction — Umbrella lives on its own page.
 *
 * Reconciliation, precisely: the Wallet card + Wallet tab read this exact
 * `productBalances` source. The Lend / Borrow / Multiply tabs compute their own net
 * figures from the client session read-models (credit-engine / multiply / lend state)
 * — which are HYDRATED from this same productBalances query (see
 * ConvexAvanaSessionsProvider), so they share an origin but re-derive on the client.
 * They should reconcile, but are NOT identical by construction; the aggregation
 * invariant (hero == Σ product nets) is pinned by dashboard-net-value-parity.test.ts.
 */
/**
 * Widest gap tolerated between a row's IMPLIED unit price (`valueUsd / amount`) and the live
 * oracle price before we stop trusting `amount` as a token quantity. Mirrors the LP reprice
 * drift band in convex/wallet/productBalances.ts: a genuine intra-session price move is
 * bounded, while a units mismatch is orders of magnitude off.
 */
export const AMOUNT_TRUST_DRIFT_BAND = { min: 0.1, max: 10 } as const

/**
 * How far a live price may sit from $1 and still be treated as "peg-like". A USD-in-amount row for a
 * token whose live price is within this of $1 is harmless to reprice (`amount × ~1 ≈ the stored USD`),
 * so it need not be rejected; outside it the reprice would materially distort the value.
 */
export const AMOUNT_USD_PEG_TOLERANCE = 0.05

/**
 * True when `row.amount` can be trusted as a TOKEN QUANTITY and repriced live.
 *
 * Several writers store a USD figure in `amount` instead of a token count — the multiply debt
 * row writes `amount: debtValueUsd` outright, and `adjustProductBalanceUsd` falls back to
 * `priceUsd = 1` whenever it CREATES a row, so the first deposit/borrow into a market with no
 * existing row lands USD in `amount`. Repricing those as `amount × livePrice` multiplies the
 * position by the token price: a verified 1 AAVE ($120.18) lend deposit contributed $14,443 to
 * Net Value. The stored `valueUsd` is correct in every one of those cases, so fall back to it.
 *
 * Those writers set `amount === valueUsd`, so a USD-in-amount row's IMPLIED unit price is exactly 1.
 * A genuine token's implied price is its real price; only a ~$1 token implies ≈1, and then its live
 * price is ≈1 too (repricing is harmless). So an implied price of ≈1 against a live price that is NOT
 * ≈1 is a USD-in-amount row for ANY token — this catches sub-$10 tokens (LDO, CRV, ARB, EURC…) whose
 * price sits inside the drift band, where the band alone (`live/implied ∈ [0.1, 10]`) let the reprice
 * through and doubled/scaled the value. The band still guards genuinely token-denominated rows.
 */
function amountIsTokenDenominated(amount: number, valueUsd: number, livePriceUsd: number): boolean {
  if (!(amount > 0) || !(valueUsd > 0)) return false
  const impliedPriceUsd = valueUsd / amount
  if (!Number.isFinite(impliedPriceUsd) || impliedPriceUsd <= 0) return false
  const impliedIsUsdLike = Math.abs(impliedPriceUsd - 1) < 1e-4
  const liveIsUsdLike = Math.abs(livePriceUsd - 1) <= AMOUNT_USD_PEG_TOLERANCE
  if (impliedIsUsdLike && !liveIsUsdLike) return false
  const scale = livePriceUsd / impliedPriceUsd
  if (!Number.isFinite(scale)) return false
  return scale >= AMOUNT_TRUST_DRIFT_BAND.min && scale <= AMOUNT_TRUST_DRIFT_BAND.max
}

/**
 * Product buckets that MIRROR liquid wallet holdings rather than holding separate capital, so
 * counting both double-counts the same tokens. Matches `selectDashboardWalletValueRows`, which
 * already applies this rule on the Wallet tab — Net Value read the raw rows and did not, so a
 * lend withdrawal (which credits BOTH `walletLiquidBalances` and the lend `available` bucket)
 * permanently inflated the headline by the withdrawn amount.
 *
 * `multiply_available` is deliberately absent: it is a separate equity budget allocated to
 * Multiply, not a mirror of a liquid row.
 */
const LIQUID_MIRROR_SOURCE_TYPES = new Set(["lend_available", "borrow_collateral_unpledged"])

export function aggregateNetValueUsd(
  rows: readonly UserAssetBalance[],
  priceFor: (symbol: string) => number | undefined,
): number {
  const liquidAssetIds = new Set(rows.filter((row) => row.sourceType === "wallet").map((row) => row.assetId))
  let total = 0
  for (const row of rows) {
    if (LIQUID_MIRROR_SOURCE_TYPES.has(row.sourceType) && liquidAssetIds.has(row.assetId)) continue
    const stored = row.valueUsd ?? 0
    const asset = getSwapAsset(row.assetId)
    const isLp = asset?.isLpToken ?? false
    const live = isLp ? undefined : priceFor(asset?.symbol ?? row.assetId)
    // Multiply available buckets store a USD budget. Legacy rows can contain
    // that USD budget again in `amount`, so valuing them as `amount × price`
    // inflates Net Value into the millions. Their stored USD value is canonical.
    const isMultiplyAvailable = row.sourceType === "multiply_available"
    const magnitude =
      isMultiplyAvailable || live == null || !Number.isFinite(live)
        ? Math.abs(stored)
        : amountIsTokenDenominated(row.amount, Math.abs(stored), live)
          ? row.amount * live
          : Math.abs(stored)
    // productBalances encodes debt as a negative stored valueUsd; preserve that sign.
    total += (stored < 0 ? -1 : 1) * magnitude
  }
  return total
}

/**
 * Your Dashboard headlines: Wallet Balance (wallet-accessible), Net Value (all products),
 * and Net APY (equity-weighted blend of Lend / Borrow / Multiply session metrics).
 */
export function useDashboardPortfolioSummary(walletId: string | undefined): DashboardPortfolioSummary {
  const hasMounted = useHasMounted()
  const balances = useConvexProductWalletBalances(walletId)
  const priceFor = useCanonicalPriceFor()
  const portfolio = useQuery(api.sandbox.transactions.getPortfolio, walletId ? { wallet: walletId } : "skip")
  const borrowSession = useBorrowSessionContext()
  const lendSession = useLendSessionContext()
  const multiplySession = useMultiplySessionContext()

  const walletRows = selectDashboardWalletValueRows(
    buildDashboardWalletBalanceRows({
      walletId: walletId ?? "",
      balances: balances ?? undefined,
      priceFor,
    }),
  )
  const walletBalanceUsd = sumWalletValueUsd(walletRows)

  const productNetValueUsd = aggregateNetValueUsd(balances ?? [], priceFor)

  const clientMetrics = useMemo(() => {
    if (!hasMounted || !walletId) return { netApyPct: null as number | null, netAccruedInterestUsd: 0 }

    const legs: Array<{ equityUsd: number; netApyPct: number }> = []
    // Interest each product has earned (+) or owes (−) since its positions opened. The
    // productBalances aggregate values every position at its PRINCIPAL basis (seed USD, or
    // amount × live price for repriced legs) and never folds in the accrued yield/cost, so the
    // headline sat below the tabs by exactly this net carry — Lend "Interest Earned", Multiply's
    // net loop carry, minus Borrow "Interest Owed". These are the same figures the tabs already
    // compute from each position's openedAt; crediting them on read (never a stored rate, matching
    // every other dashboard metric) makes Net Value reflect earnings instead of frozen principal.
    let netAccruedInterestUsd = 0

    try {
      const lendTab = buildPortfolioLendData(walletId, lendSession.state)
      const lendMetrics = buildLendDashboardMetrics(lendTab)
      if (lendMetrics.totalSuppliedUsd > 0) {
        legs.push({ equityUsd: lendMetrics.totalSuppliedUsd, netApyPct: lendMetrics.netApyPct })
      }
      netAccruedInterestUsd += lendMetrics.interestEarnedUsd
    } catch {
      // Session may not be hydrated yet.
    }

    try {
      if (borrowSession.state.accounts[walletId]) {
        const borrow = buildBorrowBalanceMetrics(borrowSession.state, walletId)
        if (borrow.netValueUsd > 0) {
          legs.push({ equityUsd: borrow.netValueUsd, netApyPct: borrow.netApyPct })
        }
        // Accrued debt interest is a cost — it grows what the wallet owes, so it reduces net value.
        netAccruedInterestUsd -= borrow.interestOwedUsd
      }
    } catch {
      // ignore
    }

    try {
      const multiplyTab = buildPortfolioMultiplyData(walletId, multiplySession.state, [], priceFor)
      const multiply = buildMultiplyBalanceMetrics(multiplySession.state, walletId, multiplyTab)
      if (multiply.netValueUsd > 0) {
        legs.push({ equityUsd: multiply.netValueUsd, netApyPct: multiply.netApyPct })
      }
      // Already the NET loop carry (supply yield − borrow cost); can be negative.
      netAccruedInterestUsd += multiply.interestEarnedUsd
    } catch {
      // ignore
    }

    return { netApyPct: blendEquityWeightedNetApyPct(legs), netAccruedInterestUsd }
  }, [borrowSession.state, hasMounted, lendSession.state, multiplySession.state, priceFor, walletId])

  return {
    walletBalanceUsd,
    // Live-priced productBalances aggregate (principal basis) PLUS the net interest accrued across
    // products, so the headline reflects earned yield rather than frozen principal. The aggregate
    // never carries that interest, so there is no double-count with the credit-engine net.
    netValueUsd: productNetValueUsd + clientMetrics.netAccruedInterestUsd,
    netApyPct: resolveDashboardNetApyPct(clientMetrics.netApyPct, portfolio?.netApyPct),
  }
}
