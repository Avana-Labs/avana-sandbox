import { z } from "zod"

export const askAIToolNames = [
  "read_portfolio",
  "read_borrow_capacity",
  "read_position_risk",
  "simulate_borrow",
  "run_collateral_stress",
  "search_markets",
  "search_pool_metrics",
  "search_avana_knowledge",
] as const

export type AskAIToolName = (typeof askAIToolNames)[number]

const positionId = z.string().trim().min(1).max(160)
const assetSymbol = z.string().trim().min(1).max(24).transform((value) => value.toUpperCase())

export const askAIToolArgumentSchemas = {
  read_portfolio: z.object({}).strict(),
  read_borrow_capacity: z.object({ positionId: positionId.optional() }).strict(),
  read_position_risk: z.object({ positionId: positionId.optional() }).strict(),
  simulate_borrow: z
    .object({
      positionId,
      additionalBorrowAmount: z.number().finite().positive().max(1_000_000_000),
      borrowAsset: assetSymbol,
    })
    .strict(),
  run_collateral_stress: z
    .object({
      positionId,
      assetPriceChanges: z.record(assetSymbol, z.number().finite().min(-0.95).max(1)).refine(
        (changes) => Object.keys(changes).length > 0 && Object.keys(changes).length <= 8,
        "Provide 1 to 8 asset price changes",
      ),
    })
    .strict(),
  search_markets: z.object({ query: z.string().trim().min(1).max(200), limit: z.number().int().min(1).max(20).optional() }).strict(),
  search_pool_metrics: z.object({ marketId: z.string().trim().min(1).max(160) }).strict(),
  search_avana_knowledge: z.object({ query: z.string().trim().min(1).max(500) }).strict(),
} satisfies Record<AskAIToolName, z.ZodTypeAny>

export type AskAIDataStatus = "fresh" | "stale" | "unavailable"

export type AskAIToolResult<T> = {
  data: T
  asOf: number
  freshness: AskAIDataStatus
  source: string
}

export function parseAskAIToolArgs<TName extends AskAIToolName>(name: TName, input: unknown) {
  return askAIToolArgumentSchemas[name].parse(input) as z.infer<(typeof askAIToolArgumentSchemas)[TName]>
}
