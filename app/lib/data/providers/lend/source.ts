import {
  createDataSourceAdapter,
  DataSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import type { LendReadAdapter } from "@/app/lib/lend-system/contracts"
import { buildMockLendSystemState } from "@/app/lib/lend-system/mock"
import { SandboxLendReadAdapter } from "@/app/lib/lend-system/sandbox-read-adapter"
import { mergeConvexLendSnapshots } from "@/app/lib/lend-system/market-hydration"
import { fetchLendMarketSnapshots } from "@/app/lib/lend-system/market-hydration-server"
import type { LendSystemState } from "@/app/lib/lend-engine"
import type { LendPageData } from "./types"

/**
 * Hydrate the catalog state with Convex lend snapshots so the server-rendered lend
 * page (hero overview, spokes, featured) matches the client session and the single
 * source of truth. Falls back to the catalog state when Convex is unreachable.
 */
async function hydrateLendStateFromConvex(state: LendSystemState): Promise<LendSystemState> {
  const snapshots = await fetchLendMarketSnapshots()
  return snapshots.length > 0 ? mergeConvexLendSnapshots(state, snapshots) : state
}

export type LendPageSource = {
  adapter: DataSourceAdapter
  getLendPageData(context?: DataSourceRequestContext): Promise<DataSourceResponse<LendPageData>>
}

export const mockLendPageAdapter = createDataSourceAdapter({
  id: "lend-mock",
  label: "Lend page mock source",
  mode: "mock",
})

export const liveLendPageAdapter = createDataSourceAdapter({
  id: "lend-live",
  label: "Lend page live source",
  mode: "live",
})

function createLendPageSource({
  adapter,
  walletId = "demo-wallet",
  readAdapter,
}: {
  adapter: DataSourceAdapter
  walletId?: string
  readAdapter: LendReadAdapter
}): LendPageSource {
  return {
    adapter,
    async getLendPageData() {
      const data = await readAdapter.readLendPage(walletId)
      return {
        fetchedAt: new Date().toISOString(),
        data,
      }
    },
  }
}

export const mockLendPageSource: LendPageSource = {
  adapter: mockLendPageAdapter,
  async getLendPageData() {
    const walletId = "demo-wallet"
    const state = await hydrateLendStateFromConvex(buildMockLendSystemState(walletId))
    const readAdapter = new SandboxLendReadAdapter({ state })
    return {
      fetchedAt: new Date().toISOString(),
      data: await readAdapter.readLendPage(walletId),
    }
  },
}

export const liveLendPageSource: LendPageSource = {
  adapter: liveLendPageAdapter,
  async getLendPageData() {
    const walletId = "catalog"
    const snapshots = await fetchLendMarketSnapshots()
    if (snapshots.length === 0) {
      throw new DataSourceError({
        code: "unavailable",
        sourceId: liveLendPageAdapter.id,
        operation: "getLendPageData",
        message: "Convex returned no Lend market snapshots. Seed the market catalog before enabling live mode.",
        retryable: true,
      })
    }
    const state = mergeConvexLendSnapshots(buildMockLendSystemState(walletId), snapshots)
    const readAdapter = new SandboxLendReadAdapter({ state })
    return {
      fetchedAt: new Date().toISOString(),
      data: await readAdapter.readLendPage(walletId),
    }
  },
}

export { createLendPageSource }
