import { z } from "zod"
import { executeSourceLoad, type DataSourceRequestContext } from "@/app/lib/data/core/source-runtime"
import { resolveDataSourceMode } from "../source-mode"
import { liveRewardsPageSource, mockRewardsPageSource, type FetchRewardsPageInput, type RewardsPageSource } from "./source"
import type { RewardsPageData } from "./types"

const rewardsPageSchema = z.object({
  walletProfileId: z.string(),
  totalPools: z.number().int().nonnegative(),
  completedPools: z.number().int().nonnegative(),
  progressPercentage: z.number().nonnegative(),
  balanceTotal: z.number().nonnegative(),
  rewardPools: z.array(
    z.object({
      id: z.string(),
      href: z.string(),
      title: z.string(),
      subtitle: z.string(),
      value: z.string(),
      delta: z.string(),
      deltaClassName: z.string(),
    }).passthrough(),
  ),
  promoTabs: z.array(z.object({ id: z.string(), label: z.string() })),
  questsByTab: z.record(
    z.string(),
    z.array(z.object({ id: z.string(), title: z.string(), description: z.string(), reward: z.string(), cta: z.string(), category: z.string() }).passthrough()),
  ),
})

function getRewardsPageSource(source?: RewardsPageSource) {
  if (source) return source
  const mode = resolveDataSourceMode()
  return mode === "mock" ? mockRewardsPageSource : liveRewardsPageSource
}

function getRewardsPageFallback(source?: RewardsPageSource) {
  if (source || resolveDataSourceMode() === "mock") return undefined
  return mockRewardsPageSource
}

export async function fetchRewardsPage(
  input: FetchRewardsPageInput,
  source?: RewardsPageSource,
  context?: DataSourceRequestContext,
): Promise<RewardsPageData> {
  const response = await executeSourceLoad({
    primary: getRewardsPageSource(source),
    fallback: getRewardsPageFallback(source),
    operation: "getRewardsPageData",
    context,
    schema: rewardsPageSchema,
    load: (pageSource, requestContext) => pageSource.getRewardsPageData(input, requestContext),
  })

  return response.data
}

export type { FetchRewardsPageInput }
