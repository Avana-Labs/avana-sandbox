import { z } from "zod"
import { resolveDataSourceMode, unsupportedLiveSource } from "../source-mode"
import { mockMultiplyPageSource, type MultiplyPageSource } from "./source"
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
  if (mode === "mock") return mockMultiplyPageSource
  return unsupportedLiveSource("multiply page")
}

export async function fetchMultiplyPage(source?: MultiplyPageSource): Promise<MultiplyPageData> {
  return multiplyPageSchema.parse(await getMultiplyPageSource(source).getMultiplyPageData())
}
