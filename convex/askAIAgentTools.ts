import { createTool } from "@convex-dev/agent"
import type { Tool } from "ai"
import { z } from "zod"
import { api } from "./_generated/api"

export const readPortfolioTool: Tool = createTool({
  description:
    "Read the signed-in user's authoritative Avana balances and positions. Use for wallet, balance, holdings, or portfolio questions.",
  inputSchema: z.object({}),
  execute: (ctx): Promise<unknown> => ctx.runQuery(api.askAITools.portfolio, {}),
})

export const readBorrowCapacityTool: Tool = createTool({
  description:
    "Read the user's authoritative Credit Engine borrowing capacity, debt, health factor, and liquidation buffer.",
  inputSchema: z.object({}),
  execute: (ctx): Promise<unknown> => ctx.runQuery(api.askAITools.borrowCapacity, {}),
})

export const readPositionRiskTool: Tool = createTool({
  description:
    "Read the user's open positions and deterministic Avana engine risk state. Use before discussing actual liquidation risk.",
  inputSchema: z.object({ positionId: z.string().optional() }),
  execute: (ctx, input): Promise<unknown> => ctx.runQuery(api.askAITools.positionRisk, input),
})

export const simulateBorrowTool: Tool = createTool({
  description:
    "Run Avana's deterministic read-only borrow simulation for an open position. The amount is denominated in USD for risk calculation.",
  inputSchema: z.object({
    positionId: z.string().min(1),
    additionalBorrowAmount: z.number().positive().max(1_000_000_000),
    borrowAsset: z.string().min(1).max(32),
  }),
  execute: (ctx, input): Promise<unknown> => ctx.runQuery(api.askAITools.simulateBorrow, input),
})

export const stressPositionTool: Tool = createTool({
  description:
    "Run Avana's deterministic read-only collateral stress engine. Changes are decimal returns, for example -0.2 means a 20% fall.",
  inputSchema: z.object({
    positionId: z.string().min(1),
    assetPriceChanges: z
      .array(z.object({ symbol: z.string().min(1).max(32), change: z.number().min(-0.95).max(1) }))
      .min(1)
      .max(8),
  }),
  execute: (ctx, input): Promise<unknown> => ctx.runQuery(api.askAITools.stressPosition, input),
})

export const searchMarketsTool: Tool = createTool({
  description:
    "Search Avana's canonical Convex market catalog and fresh cached provider data. Use for prices, pools, rates, liquidity, and supported markets. Never infer live values when this returns no fresh provider data.",
  inputSchema: z.object({ query: z.string().min(1).max(200), limit: z.number().int().min(1).max(20).optional() }),
  execute: (ctx, input): Promise<unknown> => ctx.runQuery(api.askAITools.searchMarkets, input),
})

export const readPoolMetricsTool: Tool = createTool({
  description: "Read fresh canonical Convex metrics for a specific Avana market or pool.",
  inputSchema: z.object({ marketId: z.string().min(1).max(160) }),
  execute: (ctx, input): Promise<unknown> => ctx.runQuery(api.askAITools.poolMetrics, input),
})
