import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const INITIAL_KNOWLEDGE = [
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
    const terms = rawQuery
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 2)
    const rows = await ctx.db.query("askAIKnowledge").collect()
    return rows
      .map((row) => {
        const haystack = `${row.title} ${row.content} ${row.tags.join(" ")}`.toLowerCase()
        return { ...row, score: terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0) }
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(Math.max(limit ?? 6, 1), 10))
  },
})
