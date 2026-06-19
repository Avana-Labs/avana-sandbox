import { z } from "zod"
import { executeSourceLoad, type DataSourceRequestContext } from "@/app/lib/data/core/source-runtime"
import { resolveDataSourceMode } from "../source-mode"
import { liveBorrowPageSource, mockBorrowPageSource, type BorrowPageSource } from "./source"
import type { BorrowPageData } from "./types"

const borrowPageSchema = z.object({
  protocols: z.record(
    z.string(),
    z.array(
      z.object({
        name: z.string(),
        apy: z.number(),
        tvl: z.number(),
        volume24h: z.number(),
        chain: z.string(),
        isUp: z.boolean(),
        change: z.number(),
      }),
    ),
  ),
  allPools: z.array(
    z.object({
      name: z.string(),
      apy: z.number(),
      tvl: z.number(),
      volume24h: z.number(),
      chain: z.string(),
      isUp: z.boolean(),
      change: z.number(),
      protocol: z.string(),
    }),
  ),
  protocolLogos: z.record(z.string(), z.string()),
  itemsPerPage: z.number().int().positive(),
  walletId: z.string(),
  borrowSessionSeed: z.string(),
  poolCatalog: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  borrowableAssets: z.array(z.object({ id: z.string(), symbol: z.string() }).passthrough()),
  pendingRows: z.array(z.object({}).passthrough()),
  dexes: z.array(z.object({ id: z.string() }).passthrough()),
  collateralPools: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  initialDebts: z.record(z.string(), z.number()),
  borrowSnapshot: z.object({
    totalBorrowedUsd: z.number(),
    availableCreditUsd: z.number(),
    totalCollateralUsd: z.number(),
    liquidationValueUsd: z.number(),
    healthFactor: z.number().nullable(),
  }),
})

function getBorrowPageSource(source?: BorrowPageSource) {
  if (source) return source
  const mode = resolveDataSourceMode()
  return mode === "mock" ? mockBorrowPageSource : liveBorrowPageSource
}

function getBorrowPageFallback(source?: BorrowPageSource) {
  if (source || resolveDataSourceMode() === "mock") return undefined
  return mockBorrowPageSource
}

export async function fetchBorrowPage(
  source?: BorrowPageSource,
  context?: DataSourceRequestContext,
): Promise<BorrowPageData> {
  const response = await executeSourceLoad<BorrowPageSource, unknown>({
    primary: getBorrowPageSource(source),
    fallback: getBorrowPageFallback(source),
    operation: "getBorrowPageData",
    context,
    schema: borrowPageSchema,
    load: (pageSource, requestContext) => pageSource.getBorrowPageData(requestContext) as Promise<import("@/app/lib/data/core/source-runtime").DataSourceResponse<unknown>>,
  })

  return response.data as unknown as BorrowPageData
}
