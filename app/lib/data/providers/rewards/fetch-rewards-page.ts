import { z } from "zod"
import { resolveDataSourceMode, unsupportedLiveSource } from "../source-mode"
import { mockRewardsPageSource, type FetchRewardsPageInput, type RewardsPageSource } from "./source"
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
  if (mode === "mock") return mockRewardsPageSource
  return unsupportedLiveSource("rewards page")
}

export async function fetchRewardsPage(
  input: FetchRewardsPageInput,
  source?: RewardsPageSource,
): Promise<RewardsPageData> {
  return rewardsPageSchema.parse(await getRewardsPageSource(source).getRewardsPageData(input))
}

export type { FetchRewardsPageInput }
