import { z } from "zod"
import { resolveDataSourceMode, unsupportedLiveSource } from "../source-mode"
import { mockBorrowPageSource, type BorrowPageSource } from "./source"
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
  poolCatalog: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  pendingRows: z.array(z.object({}).passthrough()),
  dexes: z.array(z.object({ id: z.string() }).passthrough()),
  collateralPools: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  initialDebts: z.record(z.string(), z.number()),
})

function getBorrowPageSource(source?: BorrowPageSource) {
  if (source) return source
  const mode = resolveDataSourceMode()
  if (mode === "mock") return mockBorrowPageSource
  return unsupportedLiveSource("borrow page")
}

export async function fetchBorrowPage(source?: BorrowPageSource): Promise<BorrowPageData> {
  return borrowPageSchema.parse(await getBorrowPageSource(source).getBorrowPageData())
}
