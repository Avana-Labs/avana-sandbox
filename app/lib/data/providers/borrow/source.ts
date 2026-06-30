import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { mergeConvexMarketSnapshots } from "@/app/lib/borrow-system/market-hydration"
import { fetchConvexMarketSnapshots } from "@/app/lib/borrow-system/market-hydration-server"
import { SandboxBorrowReadAdapter } from "@/app/lib/borrow-system/sandbox-read-adapter"
import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { getDefaultWalletProfileId } from "@/app/lib/data/mock/wallet/portfolio/profiles"
import type { BorrowSystemState } from "@/app/lib/credit-engine"
import type { BorrowPageData } from "./types"

/**
 * Hydrate the catalog state with Convex market reference data so the
 * server-rendered borrow page (hero, Explore cards, initial list) matches the
 * client session and the single source of truth. Falls back to the catalog state
 * when Convex is unreachable, so the page always renders.
 */
async function hydrateBorrowStateFromConvex(state: BorrowSystemState): Promise<BorrowSystemState> {
  const snapshots = await fetchConvexMarketSnapshots()
  return snapshots.length > 0 ? mergeConvexMarketSnapshots(state, snapshots) : state
}

export type BorrowPageSource = {
  adapter: DataSourceAdapter
  getBorrowPageData(context?: DataSourceRequestContext): Promise<DataSourceResponse<BorrowPageData>>
}

export const mockBorrowPageAdapter = createDataSourceAdapter({
  id: "borrow-mock",
  label: "Borrow page mock source",
  mode: "mock",
})

export const liveBorrowPageAdapter = createDataSourceAdapter({
  id: "borrow-live",
  label: "Borrow page live source",
  mode: "live",
})

export const mockBorrowPageSource: BorrowPageSource = {
  adapter: mockBorrowPageAdapter,
  async getBorrowPageData() {
    const walletId = getDefaultWalletProfileId()
    const systemState = await hydrateBorrowStateFromConvex(buildMockBorrowSystemState(walletId))
    const readAdapter = new SandboxBorrowReadAdapter({ state: systemState })

    return {
      fetchedAt: new Date().toISOString(),
      data: await readAdapter.readBorrowPage(walletId),
    }
  },
}

export const liveBorrowPageSource: BorrowPageSource = {
  adapter: liveBorrowPageAdapter,
  async getBorrowPageData() {
    throw createUnsupportedSourceError(liveBorrowPageAdapter, "getBorrowPageData")
  },
}
