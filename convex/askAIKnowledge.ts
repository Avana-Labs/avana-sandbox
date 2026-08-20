import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { rankAskAIKnowledge } from "../app/lib/ask-ai/knowledge"

const INITIAL_KNOWLEDGE = [
  {
    key: "avana-borrow-credit-engine",
    title: "Avana Borrow and Credit Engine",
    content:
      "Avana Borrow uses the Credit Engine to evaluate collateral value, debt, available borrowing capacity, loan-to-value, liquidation thresholds, and health factor. Ask AI reads the latest persisted engine snapshot and never invents missing risk parameters.",
    tags: ["avana", "borrow", "credit engine", "ltv", "health factor", "liquidation"],
  },
  {
    key: "avana-lend-engine",
    title: "Avana Lend Engine",
    content:
      "Avana Lend supplies assets to lending markets. Its engine combines base APY and rewards APY and can project simple interest over a selected number of days; projections are estimates, not guaranteed returns.",
    tags: ["avana", "lend", "supply", "apy", "interest"],
  },
  {
    key: "avana-multiply-engine",
    title: "Avana Multiply Engine",
    content:
      "Avana Multiply models leveraged collateral and debt. Its risk calculations include multiplier, loan-to-value, liquidation threshold, and health factor; stress tests require persisted position risk parameters.",
    tags: ["avana", "multiply", "leverage", "ltv", "health factor", "stress test"],
  },
  {
    key: "avana-umbrella",
    title: "Avana Umbrella",
    content:
      "Avana Umbrella positions can be active, cooling down, withdrawable, or slashed. Ask AI derives lifecycle status from persisted cooldown, withdrawal, and slash data rather than treating protocol totals as a wallet balance.",
    tags: ["avana", "umbrella", "stake", "unstake", "cooldown", "slash"],
  },
  {
    key: "avana-lp-collateral",
    title: "LP collateral on Avana",
    content:
      "Avana evaluates LP-backed collateral using pool composition, liquidity, fees, borrower demand, pool risk, and liquidation parameters.",
    tags: ["avana", "lp", "collateral", "risk"],
  },
  {
    key: "health-factor",
    title: "Health factor",
    content:
      "Health factor compares risk-adjusted collateral value with debt. A lower health factor means a smaller liquidation buffer.",
    tags: ["health factor", "risk", "liquidation", "borrow"],
  },
  {
    key: "ask-ai-safety",
    title: "Ask AI transaction boundary",
    content: "Ask AI explains data and simulates outcomes. It never signs or submits a wallet transaction.",
    tags: ["ask ai", "simulation", "transaction"],
  },
] as const

export const seedInitial = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    for (const item of INITIAL_KNOWLEDGE) {
      const existing = await ctx.db
        .query("askAIKnowledge")
        .withIndex("by_key", (q) => q.eq("key", item.key))
        .unique()
      if (existing) await ctx.db.patch(existing._id, { ...item, tags: [...item.tags], updatedAt: now })
      else await ctx.db.insert("askAIKnowledge", { ...item, tags: [...item.tags], updatedAt: now })
    }
    return { seeded: INITIAL_KNOWLEDGE.length }
  },
})

export const search = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { query: rawQuery, limit }) => {
    const rows = await ctx.db.query("askAIKnowledge").collect()
    return rankAskAIKnowledge(rows, rawQuery, limit ?? 6)
  },
})
