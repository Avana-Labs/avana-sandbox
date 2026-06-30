import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { buildMultiplyPageData } from "@/app/lib/multiply-system/read-model"
import { buildMockMultiplySystemState } from "@/app/lib/multiply-system/mock"
import { mergeConvexMultiplySnapshots } from "@/app/lib/multiply-system/market-hydration"
import { fetchMultiplyMarketSnapshots } from "@/app/lib/multiply-system/market-hydration-server"
import type { MultiplySystemState } from "@/app/lib/multiply-engine"
import type { MultiplyPageData } from "./types"

/**
 * Hydrate the catalog state with Convex multiply snapshots so the server-rendered
 * multiply page (hero, markets table, trending) matches the client session and the
 * single source of truth. Falls back to the catalog state when Convex is unreachable.
 */
async function hydrateMultiplyStateFromConvex(state: MultiplySystemState): Promise<MultiplySystemState> {
  const snapshots = await fetchMultiplyMarketSnapshots()
  return snapshots.length > 0 ? mergeConvexMultiplySnapshots(state, snapshots) : state
}

export type MultiplyPageSource = {
  adapter: DataSourceAdapter
  getMultiplyPageData(context?: DataSourceRequestContext): Promise<DataSourceResponse<MultiplyPageData>>
}

export const mockMultiplyPageAdapter = createDataSourceAdapter({
  id: "multiply-mock",
  label: "Multiply page mock source",
  mode: "mock",
})

export const liveMultiplyPageAdapter = createDataSourceAdapter({
  id: "multiply-live",
  label: "Multiply page live source",
  mode: "live",
})

export const mockMultiplyPageSource: MultiplyPageSource = {
  adapter: mockMultiplyPageAdapter,
  async getMultiplyPageData(_context?: DataSourceRequestContext) {
    const walletId = "catalog"
    const state = await hydrateMultiplyStateFromConvex(buildMockMultiplySystemState(walletId))
    return {
      fetchedAt: new Date().toISOString(),
      data: buildMultiplyPageData(walletId, state),
    }
  },
}

export const liveMultiplyPageSource: MultiplyPageSource = {
  adapter: liveMultiplyPageAdapter,
  async getMultiplyPageData() {
    throw createUnsupportedSourceError(liveMultiplyPageAdapter, "getMultiplyPageData")
  },
}
