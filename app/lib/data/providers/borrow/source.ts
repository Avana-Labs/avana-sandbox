import { buildBorrowSnapshot } from "@/app/lib/borrow-data"
import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import {
  BORROW_DEXES,
  BORROW_PENDING_ROWS,
  BORROW_POOL_CATALOG,
  HOME_COLLATERAL_POOLS,
  HOME_INITIAL_DEBTS,
} from "@/app/lib/data/mock/shared/borrow"
import type { BorrowPageData } from "./types"

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
    const snapshot = buildBorrowSnapshot()

    return {
      fetchedAt: new Date().toISOString(),
      data: {
        ...snapshot,
        poolCatalog: BORROW_POOL_CATALOG,
        pendingRows: BORROW_PENDING_ROWS,
        dexes: BORROW_DEXES,
        collateralPools: HOME_COLLATERAL_POOLS,
        initialDebts: HOME_INITIAL_DEBTS,
      },
    }
  },
}

export const liveBorrowPageSource: BorrowPageSource = {
  adapter: liveBorrowPageAdapter,
  async getBorrowPageData() {
    throw createUnsupportedSourceError(liveBorrowPageAdapter, "getBorrowPageData")
  },
}
