import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import type { LendReadAdapter } from "@/app/lib/lend-system/contracts"
import { buildMockLendSystemState } from "@/app/lib/lend-system/mock"
import { ProductionLendReadAdapter } from "@/app/lib/lend-system/production-read-adapter"
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

function isNotImplementedError(error: unknown) {
  return error instanceof Error && error.message.includes("not implemented")
}

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
      try {
        const data = await readAdapter.readLendPage(walletId)
        return {
          fetchedAt: new Date().toISOString(),
          data,
        }
      } catch (error) {
        if (adapter.mode === "live" && isNotImplementedError(error)) {
          throw createUnsupportedSourceError(adapter, "getLendPageData")
        }
        throw error
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

export const liveLendPageSource: LendPageSource = createLendPageSource({
  adapter: liveLendPageAdapter,
  readAdapter: new ProductionLendReadAdapter(),
})

export { createLendPageSource }
