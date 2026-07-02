import {
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { createCatalogPageSources } from "@/app/lib/data/providers/catalog-page-source"
import type { LendReadAdapter } from "@/app/lib/lend-system/contracts"
import { buildMockLendSystemState } from "@/app/lib/lend-system/mock"
import { SandboxLendReadAdapter } from "@/app/lib/lend-system/sandbox-read-adapter"
import { mergeConvexLendSnapshots } from "@/app/lib/lend-system/market-hydration"
import { fetchLendMarketSnapshots } from "@/app/lib/lend-system/market-hydration-server"
import type { LendPageData } from "./types"

export type LendPageSource = {
  adapter: DataSourceAdapter
  getLendPageData(context?: DataSourceRequestContext): Promise<DataSourceResponse<LendPageData>>
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
      const data = await readAdapter.readLendPage(walletId)
      return {
        fetchedAt: new Date().toISOString(),
        data,
      }
    },
  }
}

const catalogSources = createCatalogPageSources({
  product: "lend",
  buildBaselineState: buildMockLendSystemState,
  fetchSnapshots: fetchLendMarketSnapshots,
  mergeSnapshots: mergeConvexLendSnapshots,
  readPageData: async (state, walletId) => {
    const readAdapter = new SandboxLendReadAdapter({ state })
    return readAdapter.readLendPage(walletId)
  },
})

export const mockLendPageAdapter = catalogSources.mockAdapter
export const liveLendPageAdapter = catalogSources.liveAdapter

export const mockLendPageSource: LendPageSource = {
  adapter: mockLendPageAdapter,
  getLendPageData: (context) => catalogSources.mockSource.getPageData(context),
}

export const liveLendPageSource: LendPageSource = {
  adapter: liveLendPageAdapter,
  getLendPageData: (context) => catalogSources.liveSource.getPageData(context),
}

export { createLendPageSource }
