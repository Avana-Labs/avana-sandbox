import { z } from "zod"
import { executeSourceLoad, type DataSourceRequestContext } from "@/app/lib/data/core/source-runtime"
import { resolveDataSourceMode } from "../source-mode"
import { liveMultiplyPageSource, mockMultiplyPageSource, type MultiplyPageSource } from "./source"
import type { MultiplyPageData } from "./types"

const multiplyPageSchema = z.object({
  markets: z.array(z.object({ symbol: z.string(), name: z.string(), price: z.number() }).passthrough()),
  lendRows: z.array(z.object({ protocol: z.string(), asset: z.string(), href: z.string() }).passthrough()),
  pageSize: z.number().int().positive(),
  tokenBorrowApys: z.record(z.string(), z.string()),
  tokenLogos: z.record(z.string(), z.string()),
  tokenSupplyApys: z.record(z.string(), z.string()),
})

function getMultiplyPageSource(source?: MultiplyPageSource) {
  if (source) return source
  const mode = resolveDataSourceMode()
  return mode === "mock" ? mockMultiplyPageSource : liveMultiplyPageSource
}

function getMultiplyPageFallback(source?: MultiplyPageSource) {
  if (source || resolveDataSourceMode() === "mock") return undefined
  return mockMultiplyPageSource
}

export async function fetchMultiplyPage(
  source?: MultiplyPageSource,
  context?: DataSourceRequestContext,
): Promise<MultiplyPageData> {
  const response = await executeSourceLoad({
    primary: getMultiplyPageSource(source),
    fallback: getMultiplyPageFallback(source),
    operation: "getMultiplyPageData",
    context,
    schema: multiplyPageSchema,
    load: (pageSource, requestContext) => pageSource.getMultiplyPageData(requestContext),
  })

  return response.data
}
