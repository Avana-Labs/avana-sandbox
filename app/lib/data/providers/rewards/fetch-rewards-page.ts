import { z } from "zod"
import { executeSourceLoad, type DataSourceRequestContext } from "@/app/lib/data/core/source-runtime"
import { loadWithAuthFallback } from "@/app/lib/data/providers/live-auth-fallback"
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
  return undefined
}

export async function fetchRewardsPage(
  input: FetchRewardsPageInput,
  source?: RewardsPageSource,
  context?: DataSourceRequestContext,
): Promise<RewardsPageData> {
  const loadFromSource = (pageSource: RewardsPageSource) =>
    executeSourceLoad<RewardsPageSource, unknown>({
      primary: pageSource,
      fallback: getRewardsPageFallback(source),
      operation: "getRewardsPageData",
      context,
      schema: rewardsPageSchema,
      load: (resolvedSource, requestContext) =>
        resolvedSource.getRewardsPageData(input, requestContext) as Promise<import("@/app/lib/data/core/source-runtime").DataSourceResponse<unknown>>,
    })

  const primarySource = getRewardsPageSource(source)
  const response = await loadWithAuthFallback({
    allowFallback: !source && resolveDataSourceMode() !== "mock",
    loadPrimary: () => loadFromSource(primarySource),
    loadFallback: () => loadFromSource(mockRewardsPageSource),
  })

  return response.data as unknown as RewardsPageData
}

export type { FetchRewardsPageInput }
