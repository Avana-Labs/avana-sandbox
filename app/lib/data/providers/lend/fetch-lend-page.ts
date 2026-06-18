import { z } from "zod"
import { resolveDataSourceMode, unsupportedLiveSource } from "../source-mode"
import { mockLendPageSource, type LendPageSource } from "./source"
import type { LendPageData } from "./types"

const lendPageSchema = z.object({
  tokens: z.array(z.object({ symbol: z.string(), name: z.string() }).passthrough()),
  markets: z.array(z.object({ symbol: z.string(), name: z.string() }).passthrough()),
  activity: z.array(z.object({ type: z.string(), asset: z.string(), amount: z.string(), date: z.string() }).passthrough()),
  chartSeries: z.array(z.object({ time: z.string(), value: z.number() })),
  featuredAssets: z.record(
    z.string(),
    z.object({ id: z.string(), symbol: z.string(), displayName: z.string(), apy: z.number(), iconUrl: z.string(), path: z.string() }),
  ),
  featuredSequence: z.array(z.string()),
  assetGroups: z.array(
    z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      rows: z.array(z.object({ symbol: z.string(), name: z.string(), apy: z.string() }).passthrough()),
    }),
  ),
})

function getLendPageSource(source?: LendPageSource) {
  if (source) return source
  const mode = resolveDataSourceMode()
  if (mode === "mock") return mockLendPageSource
  return unsupportedLiveSource("lend page")
}

export async function fetchLendPage(source?: LendPageSource): Promise<LendPageData> {
  return lendPageSchema.parse(await getLendPageSource(source).getLendPageData())
}
