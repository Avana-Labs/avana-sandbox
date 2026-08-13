/**
 * Borrow product — Liquidation Risk KPIs for pool detail pages.
 * Table: `borrowLiquidationDaily` (slug-keyed; not shared with multiply).
 */

import { v } from "convex/values"
import { internalMutation, query } from "../_generated/server"

type Totals = {
  liquidationsCount: number
  collateralSeizedUsd: number
  debtRepaidUsd: number
  liquidationBonusUsd: number
  collateralAtRiskUsd: number
  walletsAtRisk: number
  walletsEligibleForLiquidation: number
  badDebtUsd: number
  walletsWithBadDebt: number
}

function formatCompactUsd(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatCount(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return String(Math.round(value))
}

function foldStats(latest: Totals, previous?: Totals | null) {
  const make = (id: string, label: string, curr: number, prev: number | undefined, format: "usd" | "number") => {
    const deltaValue = prev === undefined ? 0 : curr - prev
    const abs = Math.abs(deltaValue)
    return {
      id,
      label,
      value: format === "usd" ? formatCompactUsd(curr) : formatCount(curr),
      deltaValue,
      deltaLabel: format === "usd" ? formatCompactUsd(abs) : formatCount(abs),
      goodDirection: "down" as const,
      format,
    }
  }
  return [
    make("liquidations", "Liquidations (24h)", latest.liquidationsCount, previous?.liquidationsCount, "number"),
    make(
      "collateralSeized",
      "Collateral seized (24h)",
      latest.collateralSeizedUsd,
      previous?.collateralSeizedUsd,
      "usd",
    ),
    make("debtRepaid", "Debt repaid (24h)", latest.debtRepaidUsd, previous?.debtRepaidUsd, "usd"),
    make("collateralAtRisk", "Collateral at risk", latest.collateralAtRiskUsd, previous?.collateralAtRiskUsd, "usd"),
    make("walletsAtRisk", "Wallets at risk", latest.walletsAtRisk, previous?.walletsAtRisk, "number"),
    make("badDebt", "Bad debt", latest.badDebtUsd, previous?.badDebtUsd, "usd"),
  ]
}

export const getLiquidationRisk = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const rows = await ctx.db
      .query("borrowLiquidationDaily")
      .withIndex("by_slug_day", (q) => q.eq("slug", slug))
      .order("desc")
      .take(2)
    const latest = rows[0]
    if (!latest) return null
    const previous = rows[1]
    return {
      slug,
      day: latest.day,
      stats: foldStats(latest, previous ?? null),
    }
  },
})

export const upsertLiquidationDaily = internalMutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        day: v.string(),
        liquidationsCount: v.number(),
        collateralSeizedUsd: v.number(),
        debtRepaidUsd: v.number(),
        liquidationBonusUsd: v.number(),
        collateralAtRiskUsd: v.number(),
        walletsAtRisk: v.number(),
        walletsEligibleForLiquidation: v.number(),
        badDebtUsd: v.number(),
        walletsWithBadDebt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("borrowLiquidationDaily")
        .withIndex("by_slug_day", (q) => q.eq("slug", row.slug).eq("day", row.day))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("borrowLiquidationDaily", row)
    }
    return { written: rows.length }
  },
})
